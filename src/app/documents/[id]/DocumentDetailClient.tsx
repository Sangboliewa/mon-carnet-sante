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
      <div className="card space-y-2">
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
            <div className="card text-center text-gray-500 py-6">
              <p>Aucune fiche explicative disponible pour ce type d&apos;examen.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
