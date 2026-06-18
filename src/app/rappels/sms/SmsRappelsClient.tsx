"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SmsReminder {
  id: string;
  phone_number: string;
  channel: "sms" | "whatsapp";
  reminder_type: string;
  message: string;
  send_time: string;
  days_of_week: number[];
  active: boolean;
}

interface Props {
  personId: string;
  initial: SmsReminder[];
  twilioConfigured: boolean;
}

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const TYPE_LABELS: Record<string, string> = {
  medication: "💊 Médicament",
  appointment: "📅 Rendez-vous",
  vaccination: "💉 Vaccin",
  custom: "🔔 Personnalisé",
};
const CHANNEL_ICONS: Record<string, string> = { sms: "📱", whatsapp: "💬" };

export default function SmsRappelsClient({ personId, initial, twilioConfigured }: Props) {
  const [reminders, setReminders] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);
  const [form, setForm] = useState({
    phone_number: "",
    channel: "whatsapp" as "sms" | "whatsapp",
    reminder_type: "medication",
    message: "",
    send_time: "08:00",
    days_of_week: [1, 2, 3, 4, 5, 6, 0] as number[],
  });

  const supabase = createClient();

  function toggleDay(d: number) {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter(x => x !== d)
        : [...f.days_of_week, d],
    }));
  }

  async function save() {
    if (!form.phone_number || !form.message) return;
    setSaving(true);
    const { data, error } = await supabase.from("sms_reminders").insert({
      person_id: personId,
      ...form,
    }).select().single();
    if (!error && data) setReminders([data as SmsReminder, ...reminders]);
    setShowForm(false);
    setForm({ phone_number: "", channel: "whatsapp", reminder_type: "medication", message: "", send_time: "08:00", days_of_week: [1,2,3,4,5,6,0] });
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from("sms_reminders").update({ active: !current }).eq("id", id);
    setReminders(r => r.map(x => x.id === id ? { ...x, active: !current } : x));
  }

  async function remove(id: string) {
    await supabase.from("sms_reminders").delete().eq("id", id);
    setReminders(r => r.filter(x => x.id !== id));
  }

  async function testSend(id: string) {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await fetch("/api/send-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderId: id, testMode: !twilioConfigured }),
      });
      const json = await res.json() as { sent?: number; results?: { success: boolean; error?: string }[] };
      const ok = (json.sent ?? 0) > 0;
      const err = json.results?.[0]?.error;
      setTestResult({ id, ok, msg: ok ? "✓ Message envoyé !" : `Erreur: ${err ?? "inconnue"}` });
    } catch {
      setTestResult({ id, ok: false, msg: "Erreur réseau" });
    }
    setTestingId(null);
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-8">
      {/* Twilio status */}
      <div className={`rounded-2xl border p-4 ${twilioConfigured ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${twilioConfigured ? "bg-green-500" : "bg-amber-500"}`} />
          <p className={`text-sm font-semibold ${twilioConfigured ? "text-green-700" : "text-amber-700"}`}>
            {twilioConfigured ? "Twilio connecté — envoi SMS/WhatsApp actif" : "Twilio non configuré — mode simulation"}
          </p>
        </div>
        {!twilioConfigured && (
          <p className="text-xs text-amber-600 mt-1.5">
            Pour activer les envois réels, ajoutez <code className="bg-amber-100 px-1 rounded">TWILIO_ACCOUNT_SID</code>,{" "}
            <code className="bg-amber-100 px-1 rounded">TWILIO_AUTH_TOKEN</code> et{" "}
            <code className="bg-amber-100 px-1 rounded">TWILIO_FROM_NUMBER</code> dans les variables Vercel.
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{reminders.filter(r => r.active).length}</p>
          <p className="text-xs text-gray-500">Rappels actifs</p>
        </div>
        <div className="bg-white rounded-2xl border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{reminders.filter(r => r.channel === "whatsapp").length}</p>
          <p className="text-xs text-gray-500">Via WhatsApp</p>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold text-sm active:opacity-80">
        + Nouveau rappel SMS/WhatsApp
      </button>

      {showForm && (
        <div className="bg-white rounded-2xl border p-4 space-y-4">
          <p className="font-semibold text-gray-900">Nouveau rappel</p>

          {/* Canal */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1.5">Canal d'envoi</label>
            <div className="grid grid-cols-2 gap-2">
              {(["whatsapp", "sms"] as const).map(ch => (
                <button key={ch} onClick={() => setForm(f => ({ ...f, channel: ch }))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    form.channel === ch ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-600"
                  }`}>
                  <span>{CHANNEL_ICONS[ch]}</span>
                  {ch === "whatsapp" ? "WhatsApp" : "SMS"}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1.5">Type de rappel</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <button key={v} onClick={() => setForm(f => ({ ...f, reminder_type: v }))}
                  className={`py-2 px-3 rounded-xl border text-sm text-left transition-all ${
                    form.reminder_type === v ? "border-blue-400 bg-blue-50 text-blue-700 font-medium" : "border-gray-200 text-gray-600"
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Numéro de téléphone *</label>
            <div className="flex gap-2 mt-1">
              <div className="bg-gray-100 rounded-xl px-3 flex items-center text-sm text-gray-500">+225</div>
              <input type="tel" placeholder="0701234567" value={form.phone_number}
                onChange={e => setForm(f => ({ ...f, phone_number: e.target.value.startsWith("+") ? e.target.value : `+225${e.target.value.replace(/^0/, "")}` }))}
                className="input flex-1" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Format international : +225XXXXXXXXXX</p>
          </div>

          {/* Message */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Message / médicament *</label>
            <textarea value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder={form.reminder_type === "medication" ? "ex: Metformine 500mg — 1 comprimé" : "ex: RDV Dr. Koné demain à 10h"}
              rows={2} className="input mt-1 resize-none" />
          </div>

          {/* Heure */}
          <div>
            <label className="text-xs text-gray-500 font-medium">Heure d'envoi</label>
            <input type="time" value={form.send_time}
              onChange={e => setForm(f => ({ ...f, send_time: e.target.value }))}
              className="input mt-1" />
          </div>

          {/* Jours */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-2">Jours de la semaine</label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded-full text-xs font-semibold transition-all ${
                    form.days_of_week.includes(i)
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border text-gray-600 text-sm">Annuler</button>
            <button onClick={save} disabled={saving || !form.phone_number || !form.message}
              className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? "Enregistrement…" : "Créer le rappel"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {reminders.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">Aucun rappel SMS/WhatsApp configuré</p>
        )}
        {reminders.map(r => (
          <div key={r.id} className={`bg-white rounded-2xl border p-4 ${!r.active ? "opacity-60" : ""}`}>
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-start gap-2">
                <span className="text-xl mt-0.5">{CHANNEL_ICONS[r.channel]}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{TYPE_LABELS[r.reminder_type] ?? r.reminder_type}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{r.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.phone_number} · {r.send_time.slice(0, 5)}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {DAYS.map((d, i) => (
                      <span key={i} className={`text-xs px-1.5 py-0.5 rounded-full ${
                        r.days_of_week?.includes(i) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                      }`}>{d}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Toggle active */}
                <button onClick={() => toggleActive(r.id, r.active)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${r.active ? "bg-green-500" : "bg-gray-300"}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${r.active ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <button onClick={() => remove(r.id)} className="text-red-400 text-xs">Supprimer</button>
              </div>
            </div>

            {/* Test send button */}
            {r.active && (
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                <button onClick={() => testSend(r.id)} disabled={testingId === r.id}
                  className="flex-1 py-2 rounded-xl border border-blue-200 text-blue-600 text-xs font-medium bg-blue-50 disabled:opacity-50 active:opacity-80">
                  {testingId === r.id ? "Envoi en cours…" : `${twilioConfigured ? "Envoyer maintenant" : "Tester (simulation)"}`}
                </button>
                {testResult?.id === r.id && (
                  <p className={`text-xs font-medium ${testResult.ok ? "text-green-600" : "text-red-600"}`}>{testResult.msg}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info cron */}
      <div className="bg-gray-50 rounded-2xl border p-4 text-xs text-gray-500 space-y-1.5">
        <p className="font-semibold text-gray-700">⚙️ Comment ça marche ?</p>
        <p>1. Créez un rappel avec le numéro et l'heure souhaitée</p>
        <p>2. Un cron Vercel appelle <code className="bg-gray-200 px-1 rounded">/api/send-reminder</code> toutes les 5 min</p>
        <p>3. Les messages sont envoyés automatiquement aux heures programmées</p>
        <p className="text-amber-600 font-medium mt-1">WhatsApp recommandé pour l'Afrique de l'Ouest — meilleure délivrabilité que le SMS</p>
      </div>
    </div>
  );
}
