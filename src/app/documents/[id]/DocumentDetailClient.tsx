"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MedicalDocument, ExamGlossary } from "@/lib/supabase/types";
import Disclaimer from "@/components/Disclaimer";

interface Props {
  document: MedicalDocument;
  userId: string;
  glossary: ExamGlossary | null;
}

export default function DocumentDetailClient({ document, userId, glossary }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Log document access (AGENTS.md: reads must be journalised at app layer)
  useEffect(() => {
    const supabase = createClient();
    supabase.from("document_explanations").insert({
      document_id: document.id,
      person_id: document.person_id,
      requested_by: userId,
      glossary_id: null, // just the view event, no explanation requested
    }).then(() => {});
  }, [document.id, document.person_id, userId]);

  async function handleViewDocument() {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("medical-documents")
      .createSignedUrl(document.storage_path, 300); // 5-minute URL
    if (error || !data) {
      setUrlError("Impossible d'ouvrir le document : " + error?.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    setSignedUrl(data.signedUrl);
  }

  async function handleShowExplanation() {
    setShowExplanation(true);
    if (glossary) {
      // Log the explanation view
      const supabase = createClient();
      await supabase.from("document_explanations").insert({
        document_id: document.id,
        person_id: document.person_id,
        requested_by: userId,
        glossary_id: glossary.id,
      });
    }
  }

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Document metadata */}
      <div className="card border-l-4 border-l-blue-400 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">
            {document.document_type === "ordonnance" ? "💊" :
             document.document_type === "resultat_labo" ? "🧪" :
             document.document_type === "imagerie" ? "🩻" :
             document.document_type === "compte_rendu" ? "📋" : "📄"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{document.filename}</p>
            {document.document_type && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {document.document_type}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {document.document_type && (
            <>
              <span className="text-gray-500">Type</span>
              <span className="font-medium">{document.document_type}</span>
            </>
          )}
          {document.exam_type && (
            <>
              <span className="text-gray-500">Examen</span>
              <span className="font-medium">{document.exam_type}</span>
            </>
          )}
          {document.document_date && (
            <>
              <span className="text-gray-500">Date</span>
              <span className="font-medium">{document.document_date}</span>
            </>
          )}
          {document.issuing_facility && (
            <>
              <span className="text-gray-500">Établissement</span>
              <span className="font-medium">{document.issuing_facility}</span>
            </>
          )}
          {document.file_size_bytes && (
            <>
              <span className="text-gray-500">Taille</span>
              <span className="font-medium">{Math.round(document.file_size_bytes / 1024)} Ko</span>
            </>
          )}
        </div>
        {document.notes && <p className="text-xs text-gray-500 italic">{document.notes}</p>}
      </div>

      {/* Actions */}
      <button onClick={handleViewDocument} className="btn-primary">
        📂 Ouvrir le document
      </button>
      {urlError && <p className="text-red-600 text-sm">{urlError}</p>}

      {/* Comprendre cet examen — chemin 3, aucun LLM */}
      {document.exam_type && !showExplanation && (
        <button onClick={handleShowExplanation} className="btn-secondary">
          🔍 Comprendre cet examen
        </button>
      )}

      {showExplanation && (
        <div className="space-y-3">
          <Disclaimer />
          {glossary ? (
            <div className="card space-y-3">
              <h2 className="font-bold text-gray-900">{glossary.display_name}</h2>
              {glossary.description && (
                <p className="text-sm text-gray-600">{glossary.description}</p>
              )}
              <div className="prose prose-sm text-gray-700 whitespace-pre-line text-sm leading-relaxed">
                {glossary.educational_text}
              </div>
              {glossary.normal_ranges && (
                <div className="bg-health-blue-light rounded-xl p-3">
                  <p className="text-xs font-semibold text-health-blue mb-1">Valeurs de référence générales</p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(glossary.normal_ranges, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-10 space-y-3">
              <div className="text-5xl">🔍</div>
              <p className="font-semibold text-gray-800">Pas de fiche disponible</p>
              <p className="text-sm text-gray-500 leading-relaxed px-4">
                Aucune fiche explicative n&apos;est encore disponible pour ce type d&apos;examen.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
