import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export const maxDuration = 10;

const PROMPT = `Tu es un assistant médical. Analyse ce document médical et extrais les informations. Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backtick) :
{"document_type":"ordonnance","date":null,"medecin":null,"etablissement":null,"traitements":[],"resultats_labo":[],"maladies":[],"allergies":[],"consultation":null,"resume":"résumé en 1 phrase"}
document_type: ordonnance|resultat_labo|compte_rendu|autre. Tableaux vides si rien. null si inconnu.`;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Clé ANTHROPIC_API_KEY manquante sur Vercel." }, { status: 503 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "Format non supporté. Utilisez JPEG, PNG ou PDF." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)." }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  let responseText: string;
  try {
    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT },
        ],
      }],
    });
    responseText = message.content[0].type === "text" ? message.content[0].text : "";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur API";
    return NextResponse.json({ error: "Erreur analyse IA : " + msg }, { status: 502 });
  }

  if (!responseText) return NextResponse.json({ error: "Réponse vide de l'IA." }, { status: 502 });

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); }
      catch { return NextResponse.json({ error: "Format de réponse inattendu." }, { status: 422 }); }
    } else {
      return NextResponse.json({ error: "Format de réponse inattendu." }, { status: 422 });
    }
  }

  return NextResponse.json({ result: parsed });
}
