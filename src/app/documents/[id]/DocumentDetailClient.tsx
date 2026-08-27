"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MedicalDocument, ExamGlossary } from "@/lib/supabase/types";
import Disclaimer from "@/components/Disclaimer";
import { useLang } from "@/lib/i18n/LanguageContext";

interface AIExplanation {
  title: string;
  what: string;
  why: string;
  how: string;
  results: string;
  tips: string;
}

interface Props {
  document: MedicalDocument;
  userId: string;
  glossary: ExamGlossary | null;
}

export default function DocumentDetailClient({ document, userId, glossary }: Props) {
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<AIExplanation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
      setUrlError(t("Impossible d'ouvrir le document : ", "Unable to open document: ") + error?.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    setSignedUrl(data.signedUrl);
  }

  async function handleShowExplanation() {
    setShowExplanation(true);
    if (glossary) {
      const supabase = createClient();
      await supabase.from("document_explanations").insert({
        document_id: document.id,
        person_id: document.person_id,
        requested_by: userId,
        glossary_id: glossary.id,
      });
    } else {
      setAiLoading(true);
      setAiError(null);
      try {
        const res = await fetch("/api/explain-exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exam_type: document.exam_type,
            document_type: document.document_type,
            filename: document.filename,
            notes: document.notes,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setAiExplanation(json.explanation);
      } catch {
        setAiError(t("Impossible de générer une explication.", "Unable to generate an explanation."));
      } finally {
        setAiLoading(false);
      }
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
              <span className="text-gray-500">{t("Type", "Type")}</span>
              <span className="font-medium">{document.document_type}</span>
            </>
          )}
          {document.exam_type && (
            <>
              <span className="text-gray-500">{t("Examen", "Exam")}</span>
              <span className="font-medium">{document.exam_type}</span>
            </>
          )}
          {document.document_date && (
            <>
              <span className="text-gray-500">{t("Date", "Date")}</span>
              <span className="font-medium">{document.document_date}</span>
            </>
          )}
          {document.issuing_facility && (
            <>
              <span className="text-gray-500">{t("Établissement", "Facility")}</span>
              <span className="font-medium">{document.issuing_facility}</span>
            </>
          )}
          {document.file_size_bytes && (
            <>
              <span className="text-gray-500">{t("Taille", "Size")}</span>
              <span className="font-medium">{Math.round(document.file_size_bytes / 1024)} {t("Ko", "KB")}</span>
            </>
          )}
        </div>
        {document.notes && <p className="text-xs text-gray-500 italic">{document.notes}</p>}
      </div>

      {/* Actions */}
      <button onClick={handleViewDocument} className="btn-primary">
        {t("📂 Ouvrir le document", "📂 Open document")}
      </button>
      {urlError && <p className="text-red-600 text-sm">{urlError}</p>}

      {/* Comprendre cet examen — chemin 3, aucun LLM */}
      {document.exam_type && !showExplanation && (
        <button onClick={handleShowExplanation} className="btn-secondary">
          {t("🔍 Comprendre cet examen", "🔍 Understand this exam")}
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
                  <p className="text-xs font-semibold text-health-blue mb-1">{t("Valeurs de référence générales", "General reference values")}</p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(glossary.normal_ranges, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : aiLoading ? (
            <div className="card text-center py-8 space-y-2">
              <div className="text-3xl animate-pulse">🤖</div>
              <p className="text-sm text-gray-500">{t("Génération de l'explication…", "Generating explanation…")}</p>
            </div>
          ) : aiError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{aiError}</div>
          ) : aiExplanation ? (
            <div className="card space-y-4">
              <h2 className="font-bold text-gray-900">{aiExplanation.title}</h2>
              {[
                { icon: "📋", label: t("Qu'est-ce que c'est ?", "What is it?"), text: aiExplanation.what },
                { icon: "🎯", label: t("Pourquoi cet examen ?", "Why this exam?"), text: aiExplanation.why },
                { icon: "🏥", label: t("Comment ça se passe ?", "How does it work?"), text: aiExplanation.how },
                { icon: "📊", label: t("Comprendre les résultats", "Understanding results"), text: aiExplanation.results },
                { icon: "💡", label: t("Conseils pratiques", "Practical tips"), text: aiExplanation.tips },
              ].map(({ icon, label, text }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs font-semibold text-health-blue flex items-center gap-1">{icon} {label}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                </div>
              ))}
              <p className="text-xs text-gray-400 italic border-t pt-2">
                {t("Explication générée par IA — non personnalisée à votre situation.", "AI-generated explanation — not personalized to your situation.")}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
