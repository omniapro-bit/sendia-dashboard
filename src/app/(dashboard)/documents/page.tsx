"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

type RagDocument = {
  id: string;
  doc_title: string;
  doc_type: string;
  created_at: string;
};

const ACCEPTED_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".pdf", ".docx"];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");
const MAX_BYTES = 10 * 1024 * 1024;
const TEXT_EXTS = new Set([".txt", ".md", ".csv", ".json"]);

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsText(file, "utf-8");
  });
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = r.result as string;
      resolve(res.split(",")[1] ?? res);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function readFileContent(file: File): Promise<string> {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return TEXT_EXTS.has(ext) ? readAsText(file) : readAsBase64(file);
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

  const loadDocuments = useCallback(async () => {
    if (!profile?.client_id) return;
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

  async function deleteDocument(doc: RagDocument) {
    if (!confirm(`Supprimer "${doc.doc_title}" ? Cette action est irréversible.`)) return;
    setDeletingId(doc.id);
    const { error: chunksErr } = await supabase
      .from("rag_chunks")
      .delete()
      .eq("document_id", doc.id);
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
    if (file.size > MAX_BYTES) {
      toast(`Fichier trop volumineux (max 10 Mo) : ${file.name}`, "error");
      return;
    }
    setUploading(true);
    try {
      const content = await readFileContent(file);
      const result = await api.ingestDocument(file.name, content);
      toast(`"${file.name}" ingéré — ${result.chunks_ingested} fragment(s) indexé(s).`, "success");
      loadDocuments();
    } catch {
      toast(`Erreur lors de l'ingestion de "${file.name}".`, "error");
    } finally {
      setUploading(false);
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
    <div className="px-4 md:px-8 py-8 max-w-2xl mx-auto">
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

      <section className="bg-[#16161f] border border-[#2a2a3a] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a3a]">
          <h2 className="text-base font-semibold text-[#f0f0f5]">Importer un document</h2>
          <p className="text-xs text-[#66667a] mt-0.5">
            Formats acceptés&nbsp;: .txt, .pdf, .md, .docx, .csv, .json — max 10&nbsp;Mo
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
                <p className="text-sm text-[#9999b0]">Ingestion en cours…</p>
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
                  <p className="text-xs text-[#66667a] mt-1">Un fichier à la fois</p>
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
    </div>
  );
}
