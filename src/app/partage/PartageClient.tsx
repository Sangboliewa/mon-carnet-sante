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
            <select
              className="input-field"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={creating || !selectedDocId} className="btn-primary">
            {creating ? "Création…" : "Générer le lien"}
          </button>
        </form>
      )}

      <h2 className="section-title">Liens actifs</h2>

      {links.length === 0 && (
        <div className="card text-center text-gray-500 py-6">Aucun lien de partage actif.</div>
      )}

      {links.map((link) => {
        const expired = isExpired(link);
        return (
          <div key={link.id} className={`card space-y-2 ${expired ? "opacity-60" : ""}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500">
                  Expire : {new Date(link.expires_at).toLocaleDateString("fr-FR", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-gray-400">
                  Accès : {link.access_count} fois
                </p>
              </div>
              {expired ? (
                <span className="badge-severity-mild">Expiré</span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Actif
                </span>
              )}
            </div>
            {!expired && (
              <button
                onClick={() => handleRevoke(link.id)}
                disabled={revoking === link.id}
                className="text-red-500 text-xs"
              >
                {revoking === link.id ? "Révocation…" : "Révoquer"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
