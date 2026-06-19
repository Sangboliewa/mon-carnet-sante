"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SharedLink } from "@/lib/supabase/types";

interface DocOption {
  id: string;
  filename: string;
  exam_type: string | null;
  document_type: string | null;
}

interface Props {
  personId: string;
  userId: string;
  documents: DocOption[];
  initialLinks: SharedLink[];
}

function QRDisplay({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    import("qrcode").then((QRCode) => {
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, url, { width: 180, margin: 2 }).catch(() => {});
      }
    });
  }, [url]);
  return <canvas ref={canvasRef} className="rounded-xl mx-auto" />;
}

const DURATIONS = [
  { value: 1, label: "1 heure" },
  { value: 24, label: "24 heures" },
  { value: 72, label: "3 jours" },
  { value: 168, label: "7 jours" },
];

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function PartageClient({ personId, userId, documents, initialLinks }: Props) {
  const [links, setLinks] = useState<SharedLink[]>(initialLinks);
  const [showForm, setShowForm] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [doctorNote, setDoctorNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDocId) return;
    setCreating(true);
    setCreatedUrl(null);

    const supabase = createClient();
    const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
    const token = generateToken();
    const tokenHash = await hashToken(token);

    // Create shared_link record — token_hash stocké, token brut jamais exposé en BD seul
    const { data: link, error } = await supabase
      .from("shared_links")
      .insert({
        person_id: personId,
        document_id: selectedDocId,
        created_by: userId,
        token,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error || !link) { setCreating(false); return; }

    setLinks((prev) => [link, ...prev]);

    // L'URL publique pointe vers la page /share/[token] — jamais la signed URL directement
    const origin = window.location.origin;
    const shareUrl = `${origin}/share/${token}`;
    setCreatedUrl(shareUrl);
    setCreating(false);
    setShowForm(false);
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    const supabase = createClient();
    await supabase.from("shared_links").update({ revoked: true }).eq("id", id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
    setRevoking(null);
  }

  const isExpired = (link: SharedLink) => new Date(link.expires_at) < new Date();

  return (
    <div className="px-4 py-5 space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        🔒 Les liens de partage sont sécurisés par token hashé et expiration automatique.
        Seul le destinataire peut accéder au document via le lien.
      </div>

      <button onClick={() => { setShowForm((v) => !v); setCreatedUrl(null); }} className="btn-primary">
        {showForm ? "Annuler" : "🔗 Créer un lien de partage"}
      </button>

      {createdUrl && (
        <div className="card bg-green-50 border-green-200 space-y-3">
          <p className="font-semibold text-green-800 text-sm">✓ Lien créé — à transmettre au médecin</p>
          {doctorNote && <p className="text-xs text-gray-600 italic">Note : {doctorNote}</p>}
          <QRDisplay url={createdUrl} />
          <p className="text-xs text-gray-600 break-all text-center">{createdUrl}</p>
          <button onClick={() => navigator.clipboard.writeText(createdUrl)} className="text-health-blue text-sm font-medium block text-center w-full">
            📋 Copier le lien
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card space-y-3">
          <div>
            <label className="label">Document à partager *</label>
            <select
              className="input-field"
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              required
            >
              <option value="">— Choisir un document —</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename} {d.document_type ? `(${d.document_type})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Note pour le médecin</label>
            <input className="input-field" value={doctorNote} onChange={(e) => setDoctorNote(e.target.value)} placeholder="ex : Résultats pour consultation cardiologie" />
          </div>
          <div>
            <label className="label">Durée de validité</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {DURATIONS.map((d) => (
                <button key={d.value} type="button"
                  onClick={() => setDurationHours(d.value)}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${durationHours === d.value ? "border-health-blue bg-health-blue-light text-health-blue" : "border-gray-100 text-gray-600"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={creating || !selectedDocId} className="btn-primary">
            {creating ? "Création…" : "Générer le lien"}
          </button>
        </form>
      )}

      <h2 className="section-title">Liens actifs</h2>

      {links.length === 0 && (
        <div className="card text-center py-10 space-y-3">
          <div className="text-5xl">🔗</div>
          <p className="font-semibold text-gray-800">Aucun lien de partage actif</p>
          <p className="text-sm text-gray-500 leading-relaxed px-4">
            Génère un lien sécurisé pour partager un document médical avec un médecin ou un spécialiste.
          </p>
          <button onClick={() => setShowForm(true)}
            className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
            🔗 Créer un lien de partage
          </button>
        </div>
      )}

      {links.map((link) => {
        const expired = isExpired(link);
        return (
          <div key={link.id} className={`card flex items-start gap-3 border-l-4 ${expired ? "border-l-gray-200 opacity-60" : "border-l-green-400"}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${expired ? "bg-gray-50" : "bg-green-50"}`}>
              🔗
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-xs text-gray-500">
                    Expire : {new Date(link.expires_at).toLocaleDateString("fr-FR", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Consulté {link.access_count} fois
                  </p>
                </div>
                {expired ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">Expiré</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium flex-shrink-0">Actif</span>
                )}
              </div>
              {!expired && (
                <button
                  onClick={() => handleRevoke(link.id)}
                  disabled={revoking === link.id}
                  className="text-red-400 text-xs mt-2"
                >
                  {revoking === link.id ? "Révocation…" : "Révoquer"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
