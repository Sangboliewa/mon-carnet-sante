import { createBrowserClient } from "@supabase/ssr";

// We omit the Database generic to avoid version-skew between @supabase/ssr
// and @supabase/supabase-js query-builder generics. Row types are applied at
// usage sites via explicit casts. RLS enforcement is at the DB level.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
