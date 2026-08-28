import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { person_id } = await req.json() as { person_id: string };

  // Vérifier que la personne appartient à l'utilisateur
  const { data: person } = await supabase
    .from("persons")
    .select("id")
    .eq("id", person_id)
    .single();
  if (!person) return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });

  // Récupérer le token existant ou en créer un
  const { data: existing } = await supabaseAdmin
    .from("emergency_tokens")
    .select("token")
    .eq("person_id", person_id)
    .single();

  if (existing) return NextResponse.json({ token: existing.token });

  const token = randomBytes(16).toString("hex");
  await supabaseAdmin.from("emergency_tokens").insert({ person_id, token });

  return NextResponse.json({ token });
}
