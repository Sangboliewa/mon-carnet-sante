import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Twilio send via REST — pas besoin du SDK, juste fetch
async function sendViaTwilio(to: string, body: string, channel: "sms" | "whatsapp"): Promise<{ success: boolean; sid?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER; // +1415XXXXXXX ou whatsapp:+14155238886

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio non configuré" };
  }

  const from = channel === "whatsapp" ? `whatsapp:${fromNumber}` : fromNumber;
  const toFormatted = channel === "whatsapp" ? `whatsapp:${to}` : to;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: toFormatted, Body: body }).toString(),
  });

  const json = await res.json() as { sid?: string; message?: string; error_message?: string };
  if (!res.ok) return { success: false, error: json.message ?? json.error_message ?? "Erreur Twilio" };
  return { success: true, sid: json.sid };
}

// POST /api/send-reminder — envoi manuel ou déclenché par cron
export async function POST(req: NextRequest) {
  // Auth via secret header pour cron, ou session Supabase pour UI
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = cronSecret === process.env.CRON_SECRET;

  if (!isCron) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { reminderId, testMode } = await req.json() as { reminderId?: string; testMode?: boolean };

  const supabase = await createServerSupabaseClient();

  // Charger les rappels à envoyer
  let query = supabase
    .from("sms_reminders")
    .select(`*, persons(first_name, last_name)`)
    .eq("active", true);

  if (reminderId) query = query.eq("id", reminderId);

  const { data: reminders, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!reminders?.length) return NextResponse.json({ sent: 0 });

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  const results = [];

  for (const reminder of reminders) {
    // Vérifier que c'est l'heure d'envoi (±5 min) si mode cron
    if (isCron && !testMode) {
      const [h, m] = (reminder.send_time as string).split(":").map(Number);
      const diff = Math.abs((h * 60 + m) - (currentHour * 60 + currentMin));
      if (diff > 5) continue;

      // Vérifier les jours de la semaine
      const days = reminder.days_of_week as number[]; // 0=dimanche, 6=samedi
      if (days?.length && !days.includes(now.getDay())) continue;
    }

    const person = reminder.persons as { first_name: string; last_name: string } | null;
    const firstName = person?.first_name ?? "cher patient";

    let body = "";
    if (reminder.reminder_type === "medication") {
      body = `💊 Mon Carnet Santé — Rappel médicament\n\nBonjour ${firstName},\nIl est l'heure de prendre : ${reminder.message}\n\nBonne santé ! 🌿`;
    } else if (reminder.reminder_type === "appointment") {
      body = `📅 Mon Carnet Santé — Rappel RDV\n\nBonjour ${firstName},\nVotre rendez-vous approche : ${reminder.message}\n\nPensez à confirmer si nécessaire.`;
    } else if (reminder.reminder_type === "vaccination") {
      body = `💉 Mon Carnet Santé — Rappel vaccin\n\nBonjour ${firstName},\nIl est temps de renouveler : ${reminder.message}\n\nConsultez votre centre de santé.`;
    } else {
      body = `🏥 Mon Carnet Santé\n\nBonjour ${firstName},\n${reminder.message}`;
    }

    const channel = reminder.channel as "sms" | "whatsapp";
    const result: { success: boolean; sid?: string; error?: string } = testMode
      ? { success: true, sid: "TEST_MODE" }
      : await sendViaTwilio(reminder.phone_number as string, body, channel);

    // Log l'envoi
    await supabase.from("sms_reminder_logs").insert({
      sms_reminder_id: reminder.id,
      person_id: reminder.person_id,
      sent_at: new Date().toISOString(),
      channel,
      phone_number: reminder.phone_number,
      status: result.success ? "sent" : "failed",
      error_message: result.error ?? null,
      twilio_sid: result.sid ?? null,
    });

    results.push({ id: reminder.id, ...result });
  }

  return NextResponse.json({ sent: results.filter(r => r.success).length, results });
}

// GET /api/send-reminder — déclenché par le cron Vercel (toutes les 5 min)
export async function GET(req: NextRequest) {
  // Vercel cron envoie Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.CRON_SECRET && authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Réutilise la logique POST en mode cron
  const fakeReq = new NextRequest(req.url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-cron-secret": process.env.CRON_SECRET ?? "" },
    body: JSON.stringify({}),
  });
  return POST(fakeReq);
}
