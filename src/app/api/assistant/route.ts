import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export const maxDuration = 10;

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

  const apiKey = process.env.Groq_API_KEY ?? process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Clé Groq_API_KEY manquante sur Vercel." }, { status: 503 });

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
    ] = await Promise.all([
      supabase.from("persons").select("first_name,last_name,date_of_birth,gender,blood_type").eq("id", personId).single(),
      supabase.from("allergies").select("allergen,severity").eq("person_id", personId).limit(5),
      supabase.from("treatments").select("medication_name,dosage").eq("person_id", personId).limit(5),
      supabase.from("chronic_conditions").select("condition_name").eq("person_id", personId).limit(5),
    ]);

    if (person) {
      const age = person.date_of_birth
        ? Math.floor((Date.now() - new Date(person.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
        : null;
      context = `\n\nDOSSIER PATIENT: ${person.first_name}${age ? `, ${age} ans` : ""}${person.blood_type ? `, groupe ${person.blood_type}` : ""}`;
      if (allergies?.length) context += ` | Allergies: ${allergies.map(a => a.allergen).join(", ")}`;
      if (treatments?.length) context += ` | Traitements: ${treatments.map(t => t.medication_name).join(", ")}`;
      if (conditions?.length) context += ` | Antécédents: ${conditions.map(c => c.condition_name).join(", ")}`;
    }
  }

  const systemWithContext = context ? `${SYSTEM_PROMPT}${context}` : SYSTEM_PROMPT;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens: 1024,
        temperature: 0.7,
        stream: false,
        messages: [
          { role: "system", content: systemWithContext },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "Erreur IA : " + errText.slice(0, 200) }, { status: 502 });
    }

    const json = await res.json();
    const reply = json?.choices?.[0]?.message?.content ?? "Je n'ai pas pu générer une réponse.";

    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur réseau";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
