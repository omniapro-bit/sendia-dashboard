"use client";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    api.getStats()
      .then(s => setDocCount(s.rag_documents))
      .catch(() => toast("Impossible de charger les statistiques.", "error"));
  }, [toast]);
  async function uploadFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast(`Fichier trop volumineux (max 10 Mo) : ${file.name}`, "error");
      return;
    }
    setUploading(true);
    try {
      const content = await readFileContent(file);
      const result = await api.ingestDocument(file.name, content);
      setDocCount(prev => (prev ?? 0) + 1);
      toast(`"${file.name}" ingéré — ${result.chunks_ingested} fragment(s) indexé(s).`, "success");
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
            {docCount === null ? <Spinner size="sm" /> : docCount}
          </p>
        </div>
      </div>

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
