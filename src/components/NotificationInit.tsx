"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const PUSH_KEY = "notif-push-subscribed";
const CHECK_KEY = "notif-last-check";
const PUSH_INTERVAL = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL = 4 * 60 * 60 * 1000;

export default function NotificationInit({ personId }: { personId: string }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    async function init() {
      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      // ── Web Push : souscription background (1×/jour) ──────────
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const lastSub = parseInt(localStorage.getItem(PUSH_KEY) ?? "0", 10);
        if (Date.now() - lastSub >= PUSH_INTERVAL) {
          try {
            const reg = await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
              sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(
                  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
                ) as unknown as ArrayBuffer,
              });
            }
            await fetch("/api/push-subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ subscription: sub.toJSON(), person_id: personId }),
            });
            localStorage.setItem(PUSH_KEY, String(Date.now()));
          } catch (e) {
            console.warn("Web Push souscription échouée", e);
          }
        }
      }

      // ── setTimeout : rappels médicaments intra-journée ────────
      const lastCheck = parseInt(localStorage.getItem(CHECK_KEY) ?? "0", 10);
      if (Date.now() - lastCheck < CHECK_INTERVAL) return;
      localStorage.setItem(CHECK_KEY, String(Date.now()));

      const supabase = createClient();
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      const { data: meds } = await supabase
        .from("medication_reminders")
        .select("medication_name, dosage, reminder_times")
        .eq("person_id", personId)
        .eq("active", true);

      for (const med of meds ?? []) {
        const times: string[] = Array.isArray(med.reminder_times) ? med.reminder_times : [];
        for (const t of times) {
          const [h, m] = t.split(":").map(Number);
          const target = new Date(now);
          target.setHours(h, m, 0, 0);
          if (target <= now) target.setDate(target.getDate() + 1);
          const delay = Math.min(target.getTime() - now.getTime(), 2147483647);
          setTimeout(() => {
            if (Notification.permission === "granted") {
              new Notification("💊 Prise de médicament", {
                body: `${med.medication_name}${med.dosage ? ` — ${med.dosage}` : ""}`,
                icon: "/icons/icon-192.png",
                tag: `med-${med.medication_name}-${t}-${todayStr}`,
              });
            }
          }, delay);
        }
      }
    }

    init().catch(console.error);
  }, [personId]);

  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
