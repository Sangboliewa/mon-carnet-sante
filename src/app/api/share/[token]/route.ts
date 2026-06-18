import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

// Durée de la signed URL servie au destinataire (5 minutes)
const SIGNED_URL_TTL = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Token invalide" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
  }

  // Client service_role pour bypasser RLS (lecture uniquement pour cette route)
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Calculer le hash SHA-256 du token brut
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // Rechercher le lien par hash
  const { data: link, error } = await supabase
    .from("shared_links")
    .select("id, document_id, expires_at, revoked, access_count, max_access_count")
    .eq("token_hash", tokenHash)
    .single();

  if (error || !link) {
    return NextResponse.json({ error: "Lien introuvable ou expiré" }, { status: 404 });
  }

  // Vérifications de validité
  if (link.revoked) {
    return NextResponse.json({ error: "Ce lien a été révoqué" }, { status: 403 });
  }

  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: "Ce lien a expiré" }, { status: 410 });
  }

  if (link.max_access_count !== null && link.access_count >= link.max_access_count) {
    return NextResponse.json({ error: "Nombre maximum d'accès atteint" }, { status: 403 });
  }

  if (!link.document_id) {
    return NextResponse.json({ error: "Aucun document associé à ce lien" }, { status: 404 });
  }

  // Récupérer le storage_path du document
  const { data: doc } = await supabase
    .from("medical_documents")
    .select("storage_path, filename")
    .eq("id", link.document_id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  // Générer une signed URL temporaire
  const { data: signed, error: signError } = await supabase.storage
    .from("medical-documents")
    .createSignedUrl(doc.storage_path, SIGNED_URL_TTL);

  if (signError || !signed) {
    return NextResponse.json({ error: "Impossible de générer l'URL du document" }, { status: 500 });
  }

  // Incrémenter le compteur d'accès
  await supabase
    .from("shared_links")
    .update({ access_count: link.access_count + 1 })
    .eq("id", link.id);

  // Journaliser l'accès
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
           ?? request.headers.get("x-real-ip")
           ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  await supabase.from("share_access_log").insert({
    link_id: link.id,
    ip_address: ip,
    user_agent: userAgent,
  });

  return NextResponse.json({
    signedUrl: signed.signedUrl,
    filename: doc.filename,
    expiresAt: link.expires_at,
  });
}
