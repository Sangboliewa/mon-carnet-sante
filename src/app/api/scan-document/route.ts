import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

// Hobby plan: 10s max — Haiku est ~5x plus rapide que Sonnet pour OCR
export const maxDuration = 10;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Clé API manquante. Contactez l'administrateur." }, { status: 503 });
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

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)." }, { status: 400 });
  }

  // Convert to base64
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  // Call Claude Vision
  let message;
  try {
    message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text",
            text: `Tu es un assistant médical. Analyse ce document médical (résultat d'examen, ordonnance, compte-rendu) et extrais les informations structurées.

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans commentaire) ayant cette structure exacte :

{
  "document_type": "ordonnance" | "resultat_labo" | "compte_rendu" | "autre",
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
      "category": "catégorie (NFS, Biochimie, etc.) ou null",
      "value": valeur_numerique_ou_null,
      "unit": "unité ou null",
      "ref_min": valeur_min_ou_null,
      "ref_max": valeur_max_ou_null,
      "interpretation": "Normal / Elevé / Bas ou null"
    }
  ],
  "maladies": [
    {
      "condition_name": "diagnostic ou maladie",
      "status": "active" | "resolved" | null,
      "notes": "détails ou null"
    }
  ],
  "allergies": [
    {
      "allergen": "allergène",
      "severity": "mild" | "moderate" | "severe" | "life_threatening" | null,
      "reaction": "type de réaction ou null"
    }
  ],
  "consultation": {
    "reason": "motif de consultation ou null",
    "diagnosis": "diagnostic ou null",
    "notes": "observations ou null"
  },
  "resume": "Résumé en 1-2 phrases de ce que contient le document"
}

Si une section est vide, mets un tableau vide []. Si un champ est inconnu, mets null. Extrais TOUTES les informations visibles.`,
          },
        ],
      },
    ],
  });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur API";
    return NextResponse.json({ error: "Erreur lors de l'analyse IA : " + msg }, { status: 502 });
  }

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    // Try to extract JSON from response if wrapped in markdown
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return NextResponse.json({ error: "Impossible d'analyser le document." }, { status: 422 });
      }
    } else {
      return NextResponse.json({ error: "Impossible d'analyser le document." }, { status: 422 });
    }
  }

  return NextResponse.json({ result: parsed });
}
