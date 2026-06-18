import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

// Gemini est rapide (~2-3s) — bien dans le timeout Hobby de 10s
export const maxDuration = 10;

const PROMPT = `Tu es un assistant médical. Analyse ce document médical (résultat d'examen, ordonnance, compte-rendu) et extrais les informations structurées.

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backtick, sans commentaire) ayant cette structure exacte :

{
  "document_type": "ordonnance",
  "date": "YYYY-MM-DD ou null",
  "medecin": "nom du médecin ou null",
  "etablissement": "nom de l'établissement ou null",
  "traitements": [
    {
      "medication_name": "nom du médicament",
      "dosage": "dosage ou null",
      "frequency": "fréquence ou null",
      "duration": "durée ou null",
      "notes": "instructions ou null"
    }
  ],
  "resultats_labo": [
    {
      "test_name": "nom du test",
      "category": "catégorie ou null",
      "value": null,
      "unit": "unité ou null",
      "ref_min": null,
      "ref_max": null,
      "interpretation": "Normal ou Elevé ou Bas ou null"
    }
  ],
  "maladies": [
    {
      "condition_name": "diagnostic",
      "status": "active",
      "notes": "détails ou null"
    }
  ],
  "allergies": [
    {
      "allergen": "allergène",
      "severity": "mild",
      "reaction": "type de réaction ou null"
    }
  ],
  "consultation": {
    "reason": "motif ou null",
    "diagnosis": "diagnostic ou null",
    "notes": "observations ou null"
  },
  "resume": "Résumé en 1-2 phrases de ce que contient le document"
}

document_type doit être: ordonnance | resultat_labo | compte_rendu | autre
Si une section est vide, mets un tableau vide []. Si un champ est inconnu, mets null.`;

export async function POST(request: NextRequest) {
  // Auth check
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const apiKey = process.env.Gemini_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Clé GEMINI_API_KEY manquante dans les variables d'environnement Vercel." }, { status: 503 });
  }

  // Parse multipart form
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }

  // Validate file type
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Format non supporté. Utilisez JPEG, PNG ou PDF." }, { status: 400 });
  }

  // Max 4MB (Gemini inline limit)
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 4 Mo)." }, { status: 400 });
  }

  // Convert to base64
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  // Call Gemini 1.5 Flash (gratuit — 1500 req/jour)
  let responseText: string;
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
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
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json({ error: "Erreur Gemini : " + errText.slice(0, 200) }, { status: 502 });
    }

    const geminiJson = await geminiRes.json();
    responseText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!responseText) {
      return NextResponse.json({ error: "Réponse vide de Gemini." }, { status: 502 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur réseau";
    return NextResponse.json({ error: "Erreur lors de l'analyse : " + msg }, { status: 502 });
  }

  // Parse JSON from response
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return NextResponse.json({ error: "Impossible d'analyser la réponse du document." }, { status: 422 });
      }
    } else {
      return NextResponse.json({ error: "Format de réponse inattendu." }, { status: 422 });
    }
  }

  return NextResponse.json({ result: parsed });
}
