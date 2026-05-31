"use client";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="text-blue-200 text-sm px-3 py-1 rounded-lg bg-blue-700/40 active:bg-blue-700/60"
    >
      Déconnexion
    </button>
  );
}
