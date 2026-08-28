import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await req.json();
    const { subscription, person_id } = body as {
      subscription: PushSubscriptionJSON;
      person_id: string;
    };

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Souscription invalide" }, { status: 400 });
    }

    await supabase.from("push_subscriptions").upsert({
      user_id: user.id,
      person_id,
      endpoint: subscription.endpoint,
      p256dh: (subscription.keys as Record<string, string>)?.p256dh ?? null,
      auth: (subscription.keys as Record<string, string>)?.auth ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { endpoint } = await req.json() as { endpoint: string };
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
