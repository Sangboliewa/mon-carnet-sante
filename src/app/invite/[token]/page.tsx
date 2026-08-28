import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import AcceptInviteClient from "./AcceptInviteClient";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: inv } = await admin
    .from("person_invitations")
    .select("*, persons(first_name, last_name)")
    .eq("token", token)
    .is("used_by", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!inv) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="text-5xl">🔒</div>
          <h1 className="text-xl font-bold text-gray-900">Invitation expirée</h1>
          <p className="text-sm text-gray-500">Ce lien n&apos;est plus valide ou a déjà été utilisé.</p>
        </div>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const person = inv.persons as { first_name: string; last_name: string | null };

  return (
    <AcceptInviteClient
      token={token}
      personName={`${person.first_name} ${person.last_name ?? ""}`.trim()}
      role={inv.role}
      isLoggedIn={!!user}
    />
  );
}
