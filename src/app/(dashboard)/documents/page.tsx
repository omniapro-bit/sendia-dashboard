"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { UpgradeGate } from "@/components/UpgradeGate";
import type { ClientPlan } from "@/lib/types";

type RagDocument = {
  id: string;
  doc_title: string;
  doc_type: string;
  created_at: string;
};

// Upload constraints
const ACCEPTED_TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".pdf"];
const ACCEPT_ATTR = ACCEPTED_TEXT_EXTENSIONS.join(",");
const MAX_BYTES = 10 * 1024 * 1024;

// RAG chunking parameters (~500 tokens per chunk)
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsText(file, "utf-8");
  });
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
    if (start >= text.length) break;
  }
  return chunks.filter(c => c.trim().length > 0);
}

async function insertDocumentRecord(
  clientId: string,
  fileName: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("rag_documents")
    .insert({ client_id: clientId, doc_title: fileName, doc_type: "uploaded_document" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Impossible de créer le document.");
  return data.id as string;
}

async function insertChunkRows(
  docId: string,
  clientId: string,
  chunks: string[],
): Promise<void> {
  const rows = chunks.map((content, chunk_index) => ({
    doc_id: docId,
    client_id: clientId,
    content,
    chunk_index,
  }));
  const { error } = await supabase.from("rag_chunks").insert(rows);
  if (error) {
    await supabase.from("rag_documents").delete().eq("id", docId);
    throw new Error(error.message);
  }
}

export default function DocumentsPage() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clientPlan, setClientPlan] = useState<ClientPlan | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!profile?.client_id) { setDocsLoading(false); return; }
    setDocsLoading(true);
    const { data, error } = await supabase
      .from("rag_documents")
      .select("id, doc_title, doc_type, created_at")
      .eq("client_id", profile.client_id)
      .eq("doc_type", "uploaded_document")
      .order("created_at", { ascending: false });
    if (!error && data) setDocuments(data);
    setDocsLoading(false);
  }, [profile?.client_id]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);
  useEffect(() => { api.getClientPlan().then(setClientPlan).catch(() => {}); }, []);

  async function deleteDocument(doc: RagDocument) {
    if (!confirm(`Supprimer "${doc.doc_title}" ? Cette action est irréversible.`)) return;
    setDeletingId(doc.id);
    const { error: chunksErr } = await supabase
      .from("rag_chunks")
      .delete()
      .eq("doc_id", doc.id);
    if (chunksErr) {
      toast("Erreur lors de la suppression des fragments.", "error");
      setDeletingId(null);
      return;
    }
    const { error: docErr } = await supabase
      .from("rag_documents")
      .delete()
      .eq("id", doc.id)
      .eq("client_id", profile!.client_id);
    if (docErr) {
      toast("Erreur lors de la suppression du document.", "error");
    } else {
      toast(`"${doc.doc_title}" supprimé.`, "success");
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    }
    setDeletingId(null);
  }

  async function uploadFile(file: File) {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

    if (!ACCEPTED_TEXT_EXTENSIONS.includes(ext)) {
      toast(
        `Format non pris en charge (${ext}). Utilisez .txt, .md, .csv, .json ou .pdf.`,
        "error",
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      toast(`Fichier trop volumineux (max 10 Mo) : ${file.name}`, "error");
      return;
    }
    if (!profile?.client_id) {
      toast("Session invalide. Rechargez la page.", "error");
      return;
    }

    setUploading(true);
    try {
      const text = await readAsText(file);
      const chunks = chunkText(text);

      if (chunks.length === 0) {
        toast("Le fichier est vide ou illisible.", "error");
        return;
      }

      const docId = await insertDocumentRecord(profile.client_id, file.name);
      await insertChunkRows(docId, profile.client_id, chunks);
      // Document and chunks persisted — refresh the list

      toast(
        `"${file.name}" indexé — ${chunks.length} fragment(s) créé(s).`,
        "success",
      );
      await loadDocuments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      toast(`Erreur lors de l'ingestion : ${msg}`, "error");
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-uploaded
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Mes documents</h1>
        <p className="text-[#9999b0] mt-1">Enrichissez Sendia avec vos propres documents de référence.</p>
      </div>

      <div className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#4f6ef7]/10 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-[#4f6ef7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[#f0f0f5]">Documents indexés</p>
          <p className="text-2xl font-bold text-[#4f6ef7] leading-tight">
            {docsLoading ? <Spinner size="sm" /> : documents.length}
          </p>
        </div>
      </div>

      {/* Document list */}
      <section className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#2a2a3a]">
          <h2 className="text-base font-semibold text-[#f0f0f5]">Vos documents</h2>
        </div>
        <div className="divide-y divide-[#2a2a3a]">
          {docsLoading ? (
            <div className="px-6 py-8 flex justify-center"><Spinner size="md" /></div>
          ) : documents.length === 0 ? (
            <div className="px-6 py-8 text-center text-[#66667a] text-sm">
              Aucun document importé. Ajoutez-en ci-dessous pour enrichir les réponses de Sendia.
            </div>
          ) : (
            documents.map(doc => (
              <div key={doc.id} className="px-6 py-3 flex items-center justify-between hover:bg-[#1c1c28] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#4f6ef7]/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-[#4f6ef7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#f0f0f5] truncate">{doc.doc_title}</p>
                    <p className="text-xs text-[#66667a]">
                      {new Date(doc.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteDocument(doc)}
                  disabled={deletingId === doc.id}
                  className="text-[#66667a] hover:text-[#f87171] transition-colors p-2 rounded-lg hover:bg-[#f87171]/10 disabled:opacity-50"
                  title="Supprimer"
                >
                  {deletingId === doc.id ? (
                    <Spinner size="sm" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <UpgradeGate allowed={clientPlan ? clientPlan.features.has_rag_search : false} featureName="Documents RAG">
      <section className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a3a]">
          <h2 className="text-base font-semibold text-[#f0f0f5]">Importer un document</h2>
          <p className="text-xs text-[#66667a] mt-0.5">
            Formats acceptés : .txt, .md, .csv, .json, .pdf — max 10 Mo
          </p>
        </div>
        <div className="px-6 py-6">
          <div
            role="button"
            tabIndex={0}
            aria-label="Zone de dépôt de fichier"
            onClick={() => !uploading && inputRef.current?.click()}
            onKeyDown={e => e.key === "Enter" && !uploading && inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={[
              "rounded-xl border-2 border-dashed transition-colors cursor-pointer",
              "flex flex-col items-center justify-center gap-3 py-12 px-6 text-center",
              dragging ? "border-[#4f6ef7] bg-[#4f6ef7]/5" : "border-[#2a2a3a] hover:border-[#4f6ef7]/40 hover:bg-[#1c1c28]",
              uploading ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          >
            {uploading ? (
              <>
                <Spinner size="lg" />
                <p className="text-sm text-[#9999b0]">Ingestion en cours\u2026</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-[#1c1c28] border border-[#2a2a3a] flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#66667a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#f0f0f5]">
                    Glissez un fichier ici ou{" "}
                    <span className="text-[#4f6ef7]">cliquez pour parcourir</span>
                  </p>
                  <p className="text-xs text-[#66667a] mt-1">Un fichier à la fois — .txt, .md, .csv, .json, .pdf</p>
                </div>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" size="sm" disabled={uploading}
              onClick={() => inputRef.current?.click()}>
              Choisir un fichier
            </Button>
          </div>
        </div>
      </section>
      </UpgradeGate>
    </div>
  );
}
