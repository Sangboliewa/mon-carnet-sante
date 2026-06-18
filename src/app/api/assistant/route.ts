import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const SYSTEM_PROMPT = `Tu es ABIBA, l'assistante santé de Mon Carnet Santé — le Passeport Santé Numérique des Familles Africaines.

Tu aides les utilisateurs à :
- Comprendre leurs résultats d'examens médicaux
- Expliquer les médicaments de leurs ordonnances
- Vulgariser les diagnostics en langage simple
- Répondre à des questions générales de santé
- Donner des conseils de prévention adaptés à l'Afrique de l'Ouest

Tu parles toujours en français simple, accessible, chaleureux et rassurant.
Tu adaptes ton langage au niveau de l'utilisateur.
Tu prends en compte les réalités africaines : paludisme, drépanocytose, alimentation locale, accès limité aux spécialistes.

RÈGLES ABSOLUES :
1. Tu ne poses JAMAIS de diagnostic médical
2. Tu ne prescris JAMAIS de médicaments
3. Tu termines toujours tes réponses importantes par : "⚕️ Cette information est éducative et ne remplace pas l'avis d'un médecin."
4. En cas d'urgence (douleurs thoraciques, difficultés à respirer, perte de conscience), tu dis immédiatement d'appeler le 185 (SAMU CI) ou d'aller aux urgences
5. Tu es bienveillante, patiente, jamais condescendante

FORMAT :
- Réponses courtes et claires (max 4 paragraphes)
- Utilise des listes quand c'est plus lisible
- Émojis médicaux avec parcimonie (🩺💊🔬❤️)
- Ne répète pas la question posée`;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(list) { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { messages, personId } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    personId: string;
  };

  if (!messages?.length) return NextResponse.json({ error: "Messages requis" }, { status: 400 });

  // Fetch patient context
  let context = "";
  if (personId) {
    const [
      { data: person },
      { data: allergies },
      { data: treatments },
      { data: conditions },
      { data: malaria },
    ] = await Promise.all([
      supabase.from("persons").select("first_name,last_name,date_of_birth,gender,blood_type").eq("id", personId).single(),
      supabase.from("allergies").select("allergen,severity,reaction").eq("person_id", personId).limit(10),
      supabase.from("treatments").select("medication_name,dosage,frequency").eq("person_id", personId).limit(10),
      supabase.from("chronic_conditions").select("condition_name,status").eq("person_id", personId).limit(10),
      supabase.from("malaria_episodes").select("episode_date,severity,outcome").eq("person_id", personId).order("episode_date", { ascending: false }).limit(3),
    ]);

    if (person) {
      const age = person.date_of_birth
        ? Math.floor((Date.now() - new Date(person.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null;
      context = `\n\n--- DOSSIER MÉDICAL DU PATIENT ---\nNom: ${person.first_name} ${person.last_name}${age ? `, ${age} ans` : ""}${person.gender ? `, ${person.gender}` : ""}${person.blood_type ? `, Groupe sanguin: ${person.blood_type}` : ""}`;
      if (allergies?.length) context += `\nAllergies: ${allergies.map(a => `${a.allergen} (${a.severity ?? "?"}) — ${a.reaction ?? ""}`).join(", ")}`;
      if (treatments?.length) context += `\nTraitements en cours: ${treatments.map(t => `${t.medication_name} ${t.dosage ?? ""} ${t.frequency ?? ""}`).join(", ")}`;
      if (conditions?.length) context += `\nAntécédents: ${conditions.map(c => c.condition_name).join(", ")}`;
      if (malaria?.length) context += `\nÉpisodes paludisme récents: ${malaria.length} épisode(s)`;
      context += "\n--- FIN DOSSIER ---\n";
    }
  }

  const systemWithContext = context
    ? `${SYSTEM_PROMPT}\n\nTu as accès au dossier médical du patient pour personnaliser tes réponses :${context}`
    : SYSTEM_PROMPT;

  // Stream response
  const stream = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemWithContext,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
