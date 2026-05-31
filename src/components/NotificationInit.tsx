"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ReminderEvent {
  title: string;
  body: string;
  tag: string;
  delayMs: number;
}

async function loadAllReminders(personId: string): Promise<ReminderEvent[]> {
  const supabase = createClient();
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const horizon = new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0];
  const events: ReminderEvent[] = [];

  // ── Rappels médicaments : horaires du jour ───────────────────
  const { data: medReminders } = await supabase
    .from("medication_reminders")
    .select("medication_name, dosage, reminder_times")
    .eq("person_id", personId)
    .eq("active", true);

  for (const med of medReminders ?? []) {
    const times: string[] = Array.isArray(med.reminder_times) ? med.reminder_times : [];
    for (const t of times) {
      const [h, m] = t.split(":").map(Number);
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      events.push({
        title: "💊 Prise de médicament",
        body: `${med.medication_name}${med.dosage ? ` — ${med.dosage}` : ""}`,
        tag: `med-${med.medication_name}-${t}`,
        delayMs: target.getTime() - now.getTime(),
      });
    }
  }

  // ── Rappels vaccins ──────────────────────────────────────────
  const { data: vaccins } = await supabase
    .from("vaccinations")
    .select("vaccine_name, next_dose_date")
    .eq("person_id", personId)
    .gte("next_dose_date", todayStr)
    .lte("next_dose_date", horizon);

  for (const v of vaccins ?? []) {
    const days = Math.round((new Date(v.next_dose_date).getTime() - today.getTime()) / 86400000);
    events.push({
      title: "💉 Rappel vaccin",
      body: `${v.vaccine_name} — ${days === 0 ? "aujourd'hui" : `dans ${days}j`}`,
      tag: `vax-${v.next_dose_date}`,
      delayMs: days === 0 ? 1000 : days * 86400000 - (now.getTime() % 86400000),
    });
  }

  // ── Agenda (rendez-vous) ─────────────────────────────────────
  const { data: agendaAppts } = await supabase
    .from("appointments")
    .select("title, appointment_date, appointment_time, reminder_days_before")
    .eq("person_id", personId)
    .eq("completed", false)
    .gte("appointment_date", todayStr)
    .lte("appointment_date", horizon);

  for (const a of agendaAppts ?? []) {
    const apptDay = new Date(a.appointment_date);
    apptDay.setHours(0, 0, 0, 0);
    const reminderDay = new Date(apptDay.getTime() - (a.reminder_days_before ?? 1) * 86400000);
    reminderDay.setHours(8, 0, 0, 0);
    if (reminderDay <= now) continue;
    const days = Math.round((apptDay.getTime() - today.getTime()) / 86400000);
    events.push({
      title: "📅 Rendez-vous santé",
      body: `${a.title}${a.appointment_time ? ` à ${a.appointment_time}` : ""} — ${days === 0 ? "aujourd'hui" : `dans ${days}j`}`,
      tag: `agenda-${a.appointment_date}-${a.title}`,
      delayMs: reminderDay.getTime() - now.getTime(),
    });
  }

  // ── Consultations prénatales ─────────────────────────────────
  const { data: prenatal } = await supabase
    .from("prenatal_appointments")
    .select("appointment_type, appointment_date")
    .eq("person_id", personId)
    .eq("completed", false)
    .gte("appointment_date", todayStr)
    .lte("appointment_date", horizon);

  for (const a of prenatal ?? []) {
    const days = Math.round((new Date(a.appointment_date).getTime() - today.getTime()) / 86400000);
    events.push({
      title: "🤰 Consultation prénatale",
      body: `${a.appointment_type} — ${days === 0 ? "aujourd'hui" : `dans ${days}j`}`,
      tag: `prenatal-${a.appointment_date}`,
      delayMs: days === 0 ? 2000 : days * 86400000 - (now.getTime() % 86400000),
    });
  }

  // ── Suivis médicaux ──────────────────────────────────────────
  const { data: consults } = await supabase
    .from("medical_consultations")
    .select("specialty, doctor_name, follow_up_date")
    .eq("person_id", personId)
    .gte("follow_up_date", todayStr)
    .lte("follow_up_date", horizon);

  for (const c of consults ?? []) {
    const days = Math.round((new Date(c.follow_up_date!).getTime() - today.getTime()) / 86400000);
    events.push({
      title: "🩺 Consultation de suivi",
      body: `${c.specialty ?? "Consultation"}${c.doctor_name ? ` — ${c.doctor_name}` : ""} — ${days === 0 ? "aujourd'hui" : `dans ${days}j`}`,
      tag: `consult-${c.follow_up_date}`,
      delayMs: days === 0 ? 3000 : days * 86400000 - (now.getTime() % 86400000),
    });
  }

  return events;
}

const NOTIF_KEY = "notif-last-check";
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

export default function NotificationInit({ personId }: { personId: string }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const lastCheck = parseInt(localStorage.getItem(NOTIF_KEY) ?? "0", 10);
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;

    async function init() {
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      localStorage.setItem(NOTIF_KEY, String(Date.now()));
      const events = await loadAllReminders(personId);

      for (const ev of events) {
        const delay = Math.min(Math.max(ev.delayMs, 500), 2147483647);
        setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification(ev.title, {
              body: ev.body,
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              tag: ev.tag,
            });
          }
        }, delay);
      }
    }

    init();
  }, [personId]);

  return null;
}
