import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { token } = await req.json() as { token: string };

  const { data: inv } = await admin
    .from("person_invitations")
    .select("*")
    .eq("token", token)
    .is("used_by", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!inv) return NextResponse.json({ error: "Invitation invalide ou expirée" }, { status: 400 });

  if (inv.created_by === user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas accepter votre propre invitation" }, { status: 400 });
  }

  const { error: updateError } = await admin.from("person_invitations").update({ used_by: user.id, used_at: new Date().toISOString() }).eq("id", inv.id);
  if (updateError) return NextResponse.json({ error: "Erreur lors de la validation de l'invitation" }, { status: 500 });

  const { data: existing } = await admin
    .from("person_shared_access")
    .select("id")
    .eq("person_id", inv.person_id)
    .eq("user_id", user.id)
    .single();

  if (!existing) {
    const { error: accessError } = await admin.from("person_shared_access").insert({
      person_id: inv.person_id,
      user_id: user.id,
      role: inv.role,
      granted_by: inv.created_by,
    });
    if (accessError) return NextResponse.json({ error: "Erreur lors de l'attribution de l'accès" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
