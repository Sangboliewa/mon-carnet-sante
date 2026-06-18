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

  const apiKey = process.env.Gemini_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Clé Gemini_API_KEY manquante sur Vercel." }, { status: 503 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "Format non supporté. Utilisez JPEG, PNG ou PDF." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Fichier trop volumineux (max 4 Mo)." }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  // Essayer plusieurs modèles dans l'ordre
  const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash-lite",
  ];

  let responseText = "";
  let lastError = "";

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: file.type, data: base64 } },
                { text: PROMPT },
              ],
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
          }),
        }
      );

      if (res.status === 404) { lastError = `${model}: non disponible`; continue; }
      if (res.status === 429) { lastError = `${model}: quota dépassé`; continue; }

      if (!res.ok) {
        const t = await res.text();
        lastError = `${model}: ${t.slice(0, 100)}`;
        continue;
      }

      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (text) { responseText = text; break; }
    } catch (e) {
      lastError = e instanceof Error ? e.message : "erreur réseau";
      continue;
    }
  }

  if (!responseText) {
    return NextResponse.json({ error: `Analyse impossible. ${lastError}` }, { status: 502 });
  }

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
