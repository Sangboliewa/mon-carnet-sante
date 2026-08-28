import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Initialisation VAPID ici pour éviter erreur au build (env vars absentes)
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Sécurité : vérifier le secret cron
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const todayStr = now.toISOString().split("T")[0];
  const horizon = new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0];

  let sent = 0;
  let failed = 0;

  // Récupérer toutes les souscriptions actives
  const { data: subscriptions } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*");

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0, failed: 0, message: "Aucune souscription" });
  }

  for (const sub of subscriptions) {
    const personId = sub.person_id;
    const messages: { title: string; body: string; tag: string }[] = [];

    // ── Rappels médicaments : horaire exact ──────────────────
    const { data: meds } = await supabaseAdmin
      .from("medication_reminders")
      .select("medication_name, dosage, reminder_times")
      .eq("person_id", personId)
      .eq("active", true);

    for (const med of meds ?? []) {
      const times: string[] = Array.isArray(med.reminder_times) ? med.reminder_times : [];
      for (const t of times) {
        const [h, m] = t.split(":").map(Number);
        if (h === hour && Math.abs(m - minute) <= 5) {
          messages.push({
            title: "💊 Prise de médicament",
            body: `${med.medication_name}${med.dosage ? ` — ${med.dosage}` : ""}`,
            tag: `med-${med.medication_name}-${t}`,
          });
        }
      }
    }

    // ── Rendez-vous demain ───────────────────────────────────
    if (hour === 8) {
      const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
      const { data: appts } = await supabaseAdmin
        .from("appointments")
        .select("title, appointment_time")
        .eq("person_id", personId)
        .eq("appointment_date", tomorrow)
        .eq("completed", false);

      for (const a of appts ?? []) {
        messages.push({
          title: "📅 RDV demain",
          body: `${a.title}${a.appointment_time ? ` à ${a.appointment_time}` : ""}`,
          tag: `appt-${tomorrow}-${a.title}`,
        });
      }

      // ── Vaccins dans 7 jours ─────────────────────────────
      const { data: vaccins } = await supabaseAdmin
        .from("vaccinations")
        .select("vaccine_name, next_dose_date")
        .eq("person_id", personId)
        .gte("next_dose_date", todayStr)
        .lte("next_dose_date", horizon);

      for (const v of vaccins ?? []) {
        const days = Math.round(
          (new Date(v.next_dose_date).getTime() - now.getTime()) / 86400000
        );
        if (days <= 7) {
          messages.push({
            title: "💉 Rappel vaccin",
            body: `${v.vaccine_name} — ${days === 0 ? "aujourd'hui" : `dans ${days}j`}`,
            tag: `vax-${v.next_dose_date}`,
          });
        }
      }
    }

    // Envoyer chaque notification
    if (!messages.length) continue;

    const pushSub: webpush.PushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };

    for (const msg of messages) {
      try {
        await webpush.sendNotification(pushSub, JSON.stringify(msg));
        sent++;
      } catch {
        failed++;
        // Souscription expirée — supprimer
        if (failed > 0) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  return NextResponse.json({ sent, failed, timestamp: now.toISOString() });
}
