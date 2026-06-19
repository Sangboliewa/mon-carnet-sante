"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n, type Locale } from "@/lib/i18n/context";

interface Prefs {
  language: string;
  theme: string;
  notif_reminders: boolean;
  notif_agenda: boolean;
  notif_rappels_sms: boolean;
  share_with_doctor: boolean;
}

interface Props {
  userId: string;
  email: string;
  firstName: string;
  lastName: string | null;
  prefs: Prefs | null;
  appVersion: string;
}

const LANGUAGES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

const THEMES = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "system", label: "Système" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">{title}</h2>
      <div className="card divide-y divide-gray-100 p-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-health-blue" : "bg-gray-200"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function ParametresClient({ userId, email, firstName, lastName, prefs: initialPrefs, appVersion }: Props) {
  const router = useRouter();
  const { setLocale } = useI18n();
  const defaultPrefs: Prefs = {
    language: "fr", theme: "light",
    notif_reminders: true, notif_agenda: true,
    notif_rappels_sms: false, share_with_doctor: false,
  };
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs ?? defaultPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function savePref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    if (key === "language" && (value === "fr" || value === "en")) {
      setLocale(value as Locale);
    }
    const supabase = createClient();
    await supabase.from("user_preferences").upsert({ user_id: userId, ...next });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { setPwError("Les mots de passe ne correspondent pas."); return; }
    if (pwForm.next.length < 8) { setPwError("Minimum 8 caractères."); return; }
    setPwLoading(true); setPwError(null); setPwSuccess(false);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pwForm.next });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    setPwSuccess(true);
    setPwForm({ current: "", next: "", confirm: "" });
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    const supabase = createClient();
    // Supprimer accès partagés puis profils (cascade supprime données médicales)
    await supabase.from("person_access").delete().eq("user_id", userId);
    await supabase.from("user_preferences").delete().eq("user_id", userId);
    await supabase.from("persons").delete().eq("created_by", userId);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="px-4 py-5 space-y-6">
      {/* Indicateur sauvegarde */}
      {saving && <div className="text-xs text-center text-gray-400 animate-pulse">Enregistrement…</div>}
      {saved && <div className="text-xs text-center text-health-green font-medium">✓ Enregistré</div>}

      {/* Compte */}
      <Section title="Compte">
        <Row label="Email" sub={email}>
          <span className="text-xs text-gray-400">Non modifiable</span>
        </Row>
        <Row label="Nom" sub={`${firstName} ${lastName ?? ""}`}>
          <button onClick={() => router.push("/profil")} className="text-xs text-health-blue font-medium">
            Modifier →
          </button>
        </Row>
      </Section>

      {/* Préférences */}
      <Section title="Préférences">
        <Row label="Langue">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => savePref("language", l.value)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  prefs.language === l.value
                    ? "bg-white text-health-blue shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {l.value.toUpperCase()}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Thème">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => savePref("theme", t.value)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  prefs.theme === t.value
                    ? "bg-white text-health-blue shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row label="Rappels médicaments" sub="Notifications push quotidiennes">
          <Toggle checked={prefs.notif_reminders} onChange={(v) => savePref("notif_reminders", v)} />
        </Row>
        <Row label="Rendez-vous" sub="Rappels agenda santé">
          <Toggle checked={prefs.notif_agenda} onChange={(v) => savePref("notif_agenda", v)} />
        </Row>
        <Row label="SMS & WhatsApp" sub="Via Twilio (nécessite config)">
          <Toggle checked={prefs.notif_rappels_sms} onChange={(v) => savePref("notif_rappels_sms", v)} />
        </Row>
      </Section>

      {/* Confidentialité */}
      <Section title="Confidentialité">
        <Row label="Partage avec professionnels" sub="Autorise le partage de vos données avec votre médecin">
          <Toggle checked={prefs.share_with_doctor} onChange={(v) => savePref("share_with_doctor", v)} />
        </Row>
        <Row label="Export de mes données">
          <button onClick={() => router.push("/export")} className="text-xs text-health-blue font-medium">
            Exporter PDF →
          </button>
        </Row>
      </Section>

      {/* Sécurité — changement mot de passe */}
      <Section title="Sécurité">
        <div className="px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-gray-900">Changer le mot de passe</p>
          {pwError && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{pwError}</div>}
          {pwSuccess && <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">✓ Mot de passe mis à jour</div>}
          <form onSubmit={changePassword} className="space-y-2">
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={pwForm.next}
              onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
              className="input-field text-sm"
              minLength={8}
              required
            />
            <input
              type="password"
              placeholder="Confirmer le nouveau mot de passe"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              className="input-field text-sm"
              minLength={8}
              required
            />
            <button type="submit" disabled={pwLoading} className="btn-primary text-sm py-2">
              {pwLoading ? "Mise à jour…" : "Mettre à jour"}
            </button>
          </form>
        </div>
      </Section>

      {/* À propos */}
      <Section title="À propos">
        <Row label="Mon Carnet Santé" sub={`Version ${appVersion} — GBOL`}>
          <span className="text-xs text-gray-300">🩺</span>
        </Row>
        <Row label="Développé par" sub="Sangboliéwa Lanzeny Ouattara">
          <span className="text-xs text-gray-400">GBOL</span>
        </Row>
      </Section>

      {/* Actions compte */}
      <div className="space-y-3 pt-2">
        <button
          onClick={handleLogout}
          className="w-full text-center py-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm bg-white"
        >
          Se déconnecter
        </button>

        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-full text-center py-3 rounded-xl border border-red-200 text-red-500 font-medium text-sm"
          >
            Supprimer mon compte
          </button>
        ) : (
          <div className="card border-red-200 bg-red-50 space-y-3">
            <p className="text-sm text-red-800 font-medium">⚠️ Cette action est irréversible.</p>
            <p className="text-xs text-red-600">Toutes vos données médicales seront définitivement effacées.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(false)} className="btn-secondary text-sm py-2 flex-1">
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white font-semibold text-sm"
              >
                {deleteLoading ? "Suppression…" : "Confirmer"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
