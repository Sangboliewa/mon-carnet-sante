"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/lib/i18n/LanguageContext";

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
  const { lang } = useLang();
  const t = (fr: string, en: string) => lang === "en" ? en : fr;
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
      setTestResult({ id, ok, msg: ok ? t("✓ Message envoyé !", "✓ Message sent!") : `${t("Erreur", "Error")}: ${err ?? t("inconnue", "unknown")}` });
    } catch {
      setTestResult({ id, ok: false, msg: t("Erreur réseau", "Network error") });
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
            {twilioConfigured ? t("Twilio connecté — envoi SMS/WhatsApp actif", "Twilio connected — SMS/WhatsApp sending active") : t("Twilio non configuré — mode simulation", "Twilio not configured — simulation mode")}
          </p>
        </div>
        {!twilioConfigured && (
          <p className="text-xs text-amber-600 mt-1.5">
            {t("Pour activer les envois réels, ajoutez", "To enable real sending, add")} <code className="bg-amber-100 px-1 rounded">TWILIO_ACCOUNT_SID</code>,{" "}
            <code className="bg-amber-100 px-1 rounded">TWILIO_AUTH_TOKEN</code> {t("et", "and")}{" "}
            <code className="bg-amber-100 px-1 rounded">TWILIO_FROM_NUMBER</code> {t("dans les variables Vercel.", "in your Vercel environment variables.")}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{reminders.filter(r => r.active).length}</p>
          <p className="text-xs text-gray-500">{t("Rappels actifs", "Active reminders")}</p>
        </div>
        <div className="bg-white rounded-2xl border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{reminders.filter(r => r.channel === "whatsapp").length}</p>
          <p className="text-xs text-gray-500">{t("Via WhatsApp", "Via WhatsApp")}</p>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)}
        className="w-full py-3 rounded-2xl bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold text-sm active:opacity-80">
        + {t("Nouveau rappel SMS/WhatsApp", "New SMS/WhatsApp reminder")}
      </button>

      {showForm && (
        <div className="bg-white rounded-2xl border p-4 space-y-4">
          <p className="font-semibold text-gray-900">{t("Nouveau rappel", "New reminder")}</p>

          {/* Canal */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1.5">{t("Canal d'envoi", "Send channel")}</label>
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
            <label className="text-xs text-gray-500 font-medium block mb-1.5">{t("Type de rappel", "Reminder type")}</label>
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
            <label className="text-xs text-gray-500 font-medium">{t("Numéro de téléphone *", "Phone number *")}</label>
            <div className="flex gap-2 mt-1">
              <div className="bg-gray-100 rounded-xl px-3 flex items-center text-sm text-gray-500">+225</div>
              <input type="tel" placeholder="0701234567" value={form.phone_number}
                onChange={e => setForm(f => ({ ...f, phone_number: e.target.value.startsWith("+") ? e.target.value : `+225${e.target.value.replace(/^0/, "")}` }))}
                className="input flex-1" />
            </div>
            <p className="text-xs text-gray-400 mt-1">{t("Format international : +225XXXXXXXXXX", "International format: +225XXXXXXXXXX")}</p>
          </div>

          {/* Message */}
          <div>
            <label className="text-xs text-gray-500 font-medium">{t("Message / médicament *", "Message / medication *")}</label>
            <textarea value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder={form.reminder_type === "medication" ? t("ex: Metformine 500mg — 1 comprimé", "e.g. Metformin 500mg — 1 tablet") : t("ex: RDV Dr. Koné demain à 10h", "e.g. Appt Dr. Koné tomorrow at 10am")}
              rows={2} className="input mt-1 resize-none" />
          </div>

          {/* Heure */}
          <div>
            <label className="text-xs text-gray-500 font-medium">{t("Heure d'envoi", "Send time")}</label>
            <input type="time" value={form.send_time}
              onChange={e => setForm(f => ({ ...f, send_time: e.target.value }))}
              className="input mt-1" />
          </div>

          {/* Jours */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-2">{t("Jours de la semaine", "Days of the week")}</label>
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
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border text-gray-600 text-sm">{t("Annuler", "Cancel")}</button>
            <button onClick={save} disabled={saving || !form.phone_number || !form.message}
              className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? t("Enregistrement…", "Saving…") : t("Créer le rappel", "Create reminder")}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {reminders.length === 0 && (
          <div className="card text-center py-10 space-y-3">
            <div className="text-5xl">💬</div>
            <p className="font-semibold text-gray-800">{t("Aucun rappel configuré", "No reminders configured")}</p>
            <p className="text-sm text-gray-500 leading-relaxed px-4">
              {t("Reçois tes rappels médicaments directement sur WhatsApp ou par SMS, à l'heure exacte.", "Receive your medication reminders directly on WhatsApp or by SMS, at the exact time.")}
            </p>
            <button onClick={() => setShowForm(true)}
              className="inline-block bg-gradient-to-r from-green-600 to-teal-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2">
              + {t("Créer un rappel", "Create a reminder")}
            </button>
          </div>
        )}
        {reminders.map(r => {
          const borderCls = r.channel === "whatsapp" ? "border-l-green-500" : "border-l-blue-400";
          const iconBg = r.channel === "whatsapp" ? "bg-green-50" : "bg-blue-50";
          return (
            <div key={r.id} className={`card flex items-start gap-3 border-l-4 ${borderCls} ${!r.active ? "opacity-60" : ""}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${iconBg}`}>
                {CHANNEL_ICONS[r.channel]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
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
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button onClick={() => toggleActive(r.id, r.active)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${r.active ? "bg-green-500" : "bg-gray-300"}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${r.active ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                    <button onClick={() => remove(r.id)} className="text-red-400 text-xs">{t("Supprimer", "Delete")}</button>
                  </div>
                </div>

                {r.active && (
                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                    <button onClick={() => testSend(r.id)} disabled={testingId === r.id}
                      className="flex-1 py-2 rounded-xl border border-blue-200 text-blue-600 text-xs font-medium bg-blue-50 disabled:opacity-50 active:opacity-80">
                      {testingId === r.id ? t("Envoi en cours…", "Sending…") : `${twilioConfigured ? t("Envoyer maintenant", "Send now") : t("Tester (simulation)", "Test (simulation)")}`}
                    </button>
                    {testResult?.id === r.id && (
                      <p className={`text-xs font-medium ${testResult.ok ? "text-green-600" : "text-red-600"}`}>{testResult.msg}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info cron */}
      <div className="bg-gray-50 rounded-2xl border p-4 text-xs text-gray-500 space-y-1.5">
        <p className="font-semibold text-gray-700">⚙️ {t("Comment ça marche ?", "How does it work?")}</p>
        <p>1. {t("Créez un rappel avec le numéro et l'heure souhaitée", "Create a reminder with the number and desired time")}</p>
        <p>2. {t("Un cron Vercel appelle", "A Vercel cron calls")} <code className="bg-gray-200 px-1 rounded">/api/send-reminder</code> {t("toutes les 5 min", "every 5 min")}</p>
        <p>3. {t("Les messages sont envoyés automatiquement aux heures programmées", "Messages are sent automatically at scheduled times")}</p>
        <p className="text-amber-600 font-medium mt-1">{t("WhatsApp recommandé pour l'Afrique de l'Ouest — meilleure délivrabilité que le SMS", "WhatsApp recommended for West Africa — better deliverability than SMS")}</p>
      </div>
    </div>
  );
}
