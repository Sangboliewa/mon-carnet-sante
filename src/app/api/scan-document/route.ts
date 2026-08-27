import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export const maxDuration = 30;

const PROMPT_JSON = `Tu es un assistant médical. Analyse ce document médical et extrais les informations. Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backtick) :
{"document_type":"ordonnance","date":null,"medecin":null,"etablissement":null,"traitements":[],"resultats_labo":[],"maladies":[],"allergies":[],"consultation":null,"resume":"résumé en 1 phrase"}
document_type: ordonnance|resultat_labo|compte_rendu|autre. Tableaux vides si rien. null si inconnu.`;

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  // Use pdfjs-dist in Node.js mode (no canvas needed for text extraction)
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);
  const pdf = await (pdfjsLib as { getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str: string }[] }> }> }> } }).getDocument({ data: buffer }).promise;
  const texts: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    texts.push(content.items.map((item: { str: string }) => item.str).join(" "));
  }
  return texts.join("\n");
}

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

  const apiKey = (process.env.Groq_API_KEY ?? process.env.GROQ_API_KEY ?? "").replace(/^﻿/, "").trim();
  if (!apiKey) return NextResponse.json({ error: "Clé GROQ_API_KEY manquante sur Vercel." }, { status: 503 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });

  const allowedImages = ["image/jpeg", "image/png", "image/webp"];
  const isPdf = file.type === "application/pdf";
  if (!isPdf && !allowedImages.includes(file.type)) {
    return NextResponse.json({ error: "Format non supporté. Utilisez JPEG, PNG ou PDF." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });

  const buffer = await file.arrayBuffer();
  let responseText = "";

  try {
    if (isPdf) {
      // PDF → extract text → text model
      let pdfText = "";
      try {
        pdfText = await extractPdfText(buffer);
      } catch {
        return NextResponse.json({ error: "Impossible de lire ce PDF. Essayez une image JPEG ou PNG." }, { status: 422 });
      }
      if (!pdfText.trim()) {
        return NextResponse.json({ error: "Ce PDF ne contient pas de texte lisible (PDF scanné). Importez une image à la place." }, { status: 422 });
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          temperature: 0.1,
          messages: [
            { role: "system", content: PROMPT_JSON },
            { role: "user", content: `Voici le texte extrait du document médical :\n\n${pdfText.slice(0, 6000)}` },
          ],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: "Erreur Groq : " + errText.slice(0, 200) }, { status: 502 });
      }
      const json = await res.json();
      responseText = json?.choices?.[0]?.message?.content ?? "";

    } else {
      // Image → vision model
      const base64 = Buffer.from(buffer).toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          max_tokens: 800,
          temperature: 0.1,
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl } },
              { type: "text", text: PROMPT_JSON },
            ],
          }],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: "Erreur Groq : " + errText.slice(0, 200) }, { status: 502 });
      }
      const json = await res.json();
      responseText = json?.choices?.[0]?.message?.content ?? "";
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur réseau";
    return NextResponse.json({ error: "Erreur analyse : " + msg }, { status: 502 });
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
      return NextResponse.json({ error: "Format inattendu." }, { status: 422 });
    }
  }

  return NextResponse.json({ result: parsed });
}
