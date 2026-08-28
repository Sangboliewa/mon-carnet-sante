import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { person_id, role = "viewer" } = await req.json() as { person_id: string; role?: string };

  const { data: person } = await supabase.from("persons").select("id,first_name").eq("id", person_id).eq("created_by", user.id).single();
  if (!person) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  const token = randomBytes(20).toString("hex");
  const expires_at = new Date(Date.now() + 7 * 86400000).toISOString();

  const { error: insertError } = await admin.from("person_invitations").insert({ person_id, token, role, created_by: user.id, expires_at });
  if (insertError) return NextResponse.json({ error: "Erreur lors de la création de l'invitation" }, { status: 500 });

  const link = `${req.headers.get("origin") ?? "https://mon-carnet-sante-nine.vercel.app"}/invite/${token}`;
  return NextResponse.json({ token, link, expires_at });
}
