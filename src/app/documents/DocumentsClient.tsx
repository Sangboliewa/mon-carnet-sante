"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MedicalDocument } from "@/lib/supabase/types";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_EXT = [".pdf", ".jpg", ".jpeg", ".png"];

const DOC_TYPES = ["Résultats d'analyse", "Ordonnance", "Compte-rendu", "Imagerie", "Autre"];
const EXAM_TYPES = ["NFS", "Glycémie", "Bilan lipidique", "Créatinine", "TSH", "ECG", "Radiographie", "Échographie", "IRM", "Scanner", "Autre"];

const DOC_ICON: Record<string, string> = {
  "Résultats d'analyse": "🧪",
  "Ordonnance": "💊",
  "Compte-rendu": "📋",
  "Imagerie": "🩻",
  "Autre": "📄",
};

const DOC_COLOR: Record<string, string> = {
  "Résultats d'analyse": "#a855f7",
  "Ordonnance": "#22c55e",
  "Compte-rendu": "#3b82f6",
  "Imagerie": "#0ea5e9",
  "Autre": "#6b7280",
};

const DOC_BG: Record<string, string> = {
  "Résultats d'analyse": "bg-purple-50",
  "Ordonnance": "bg-green-50",
  "Compte-rendu": "bg-blue-50",
  "Imagerie": "bg-sky-50",
  "Autre": "bg-gray-50",
};

function fmtDocDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " Ko";
  return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
}

interface Props {
  personId: string;
  userId: string;
  initialData: MedicalDocument[];
}

export default function DocumentsClient({ personId, userId, initialData }: Props) {
  const router = useRouter();
  const [documents, setDocuments] = useState<MedicalDocument[]>(initialData);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    document_type: "",
    exam_type: "",
    document_date: "",
    issuing_facility: "",
    notes: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!f) { setFile(null); return; }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setFileError(`Format non accepté. Utilisez : ${ALLOWED_EXT.join(", ")}`);
      setFile(null);
      return;
    }
    if (f.size > MAX_SIZE) {
      setFileError("Fichier trop volumineux (max 10 Mo).");
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    const supabase = createClient();

    // Insert metadata first to get the document ID
    const { data: doc, error: insertError } = await supabase
      .from("medical_documents")
      .insert({
        person_id: personId,
        uploaded_by: userId,
        filename: file.name,
        storage_path: "", // will update after upload
        file_type: file.type,
        file_size_bytes: file.size,
        document_type: meta.document_type || null,
        exam_type: meta.exam_type || null,
        document_date: meta.document_date || null,
        issuing_facility: meta.issuing_facility || null,
        notes: meta.notes || null,
      })
      .select()
      .single();

    if (insertError || !doc) {
      setUploadError("Erreur lors de la création du document : " + insertError?.message);
      setUploading(false);
      return;
    }

    const storagePath = `${personId}/${doc.id}/${file.name}`;

    const { error: storageError } = await supabase.storage
      .from("medical-documents")
      .upload(storagePath, file, { upsert: false });

    if (storageError) {
      // Rollback
      await supabase.from("medical_documents").delete().eq("id", doc.id);
      setUploadError("Erreur lors de l'upload : " + storageError.message);
      setUploading(false);
      return;
    }

    // Update storage path
    await supabase
      .from("medical_documents")
      .update({ storage_path: storagePath })
      .eq("id", doc.id);

    setDocuments((prev) => [{ ...doc, storage_path: storagePath }, ...prev]);
    setFile(null);
    setMeta({ document_type: "", exam_type: "", document_date: "", issuing_facility: "", notes: "" });
    setShowUpload(false);
    setUploading(false);
  }

  return (
    <div className="px-4 py-5 space-y-4">
      <button onClick={() => setShowUpload((v) => !v)} className="btn-primary">
        {showUpload ? "Annuler" : "📤 Ajouter un document"}
      </button>

      {showUpload && (
        <form onSubmit={handleUpload} className="card space-y-3">
          <div>
            <label className="label">Fichier * (PDF, JPG, PNG — max 10 Mo)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              onChange={handleFileChange}
              className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-health-blue-light file:text-health-blue file:font-medium"
            />
            {fileError && <p className="text-red-600 text-xs mt-1">{fileError}</p>}
            {file && <p className="text-green-600 text-xs mt-1">✓ {file.name} ({Math.round(file.size / 1024)} Ko)</p>}
          </div>
          <div>
            <label className="label">Type de document</label>
            <select className="input-field" value={meta.document_type} onChange={(e) => setMeta((m) => ({ ...m, document_type: e.target.value }))}>
              <option value="">— Choisir —</option>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Type d&apos;examen</label>
            <select className="input-field" value={meta.exam_type} onChange={(e) => setMeta((m) => ({ ...m, exam_type: e.target.value }))}>
              <option value="">— Choisir —</option>
              {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date du document</label>
            <input type="date" className="input-field" value={meta.document_date} onChange={(e) => setMeta((m) => ({ ...m, document_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">Établissement émetteur</label>
            <input className="input-field" placeholder="ex : CHU Yopougon" value={meta.issuing_facility} onChange={(e) => setMeta((m) => ({ ...m, issuing_facility: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input-field resize-none" rows={2} value={meta.notes} onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))} />
          </div>
          {uploadError && <p className="text-red-600 text-sm">{uploadError}</p>}
          <button type="submit" disabled={uploading || !file} className="btn-primary">
            {uploading ? "Upload en cours…" : "Téléverser le document"}
          </button>
        </form>
      )}

      {documents.length === 0 && !showUpload && (
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">📁</div>
          <p className="font-semibold text-gray-800">Ton coffre-fort est vide</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            Stocke ordonnances, résultats et bilans en sécurité. Accessibles partout, même sans connexion.
          </p>
          <button onClick={() => setShowUpload(true)} className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            + Ajouter un document
          </button>
        </div>
      )}

      {documents.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 font-medium">{documents.length} document{documents.length > 1 ? "s" : ""}</p>
        </div>
      )}

      {documents.map((doc) => {
        const dtype = doc.document_type ?? "Autre";
        const icon = DOC_ICON[dtype] ?? "📄";
        const borderColor = DOC_COLOR[dtype] ?? "#6b7280";
        const bg = DOC_BG[dtype] ?? "bg-gray-50";
        return (
          <div
            key={doc.id}
            onClick={() => router.push(`/documents/${doc.id}`)}
            className={`card flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform border-l-4`}
            style={{ borderLeftColor: borderColor }}
          >
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center text-2xl flex-shrink-0`}>
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{doc.filename}</p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {doc.document_type && (
                  <span className="text-xs font-medium" style={{ color: borderColor }}>{doc.document_type}</span>
                )}
                {doc.exam_type && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {doc.exam_type}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {doc.document_date && <p className="text-xs text-gray-400">{fmtDocDate(doc.document_date)}</p>}
                {doc.file_size_bytes && <p className="text-xs text-gray-300">{fmtSize(doc.file_size_bytes)}</p>}
              </div>
            </div>
            <span className="text-gray-300 text-lg flex-shrink-0">›</span>
          </div>
        );
      })}
    </div>
  );
}
