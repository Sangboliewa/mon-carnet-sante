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
        <div className="card text-center text-gray-500 py-8">Aucun document dans le coffre-fort.</div>
      )}

      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => router.push(`/documents/${doc.id}`)}
          className="card flex items-start gap-3 cursor-pointer active:bg-gray-50"
        >
          <span className="text-2xl mt-0.5">
            {doc.file_type === "application/pdf" ? "📄" : "🖼️"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{doc.filename}</p>
            {doc.document_type && <p className="text-xs text-gray-500">{doc.document_type}</p>}
            {doc.exam_type && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 mt-1">
                {doc.exam_type}
              </span>
            )}
            {doc.document_date && <p className="text-xs text-gray-400 mt-0.5">{doc.document_date}</p>}
          </div>
          <span className="text-gray-400">›</span>
        </div>
      ))}
    </div>
  );
}
