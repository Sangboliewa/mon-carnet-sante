import { NextResponse, type NextRequest } from "next/server";

export const maxDuration = 15;

export async function POST(request: NextRequest) {
  const { exam_type, document_type, filename, notes } = await request.json();

  const apiKey = (process.env.Groq_API_KEY ?? process.env.GROQ_API_KEY ?? "").replace(/^﻿/, "").trim();
  if (!apiKey) return NextResponse.json({ error: "Clé GROQ_API_KEY manquante sur Vercel." }, { status: 503 });

  const label = exam_type && exam_type !== "Autre" ? exam_type : (filename ?? "document médical");

  const prompt = `Tu es un assistant de santé pédagogique. Explique en termes simples et accessibles ce qu'est "${label}" (type de document: ${document_type ?? "inconnu"}).
Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backtick) avec cette structure exacte:
{"title":"Nom de l'examen en clair","what":"Ce qu'est cet examen (2-3 phrases simples)","why":"Pourquoi ce type d'examen est prescrit (2-3 phrases)","how":"Comment se déroule cet examen (2-3 phrases)","results":"Comment interpréter les résultats en général (2-3 phrases)","tips":"Conseils pratiques pour le patient (2-3 phrases)"}
Si tu ne sais pas de quel examen précis il s'agit, donne des informations générales sur le type de document médical.`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    }),
  });

  if (!groqRes.ok) return NextResponse.json({ error: "Erreur Groq" }, { status: 502 });

  const groqJson = await groqRes.json();
  const raw = groqJson.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json({ explanation: parsed });
  } catch {
    return NextResponse.json({ error: "Réponse invalide", raw }, { status: 500 });
  }
}
