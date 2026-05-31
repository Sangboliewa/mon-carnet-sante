import type { PersonRow } from "./supabase/types";

interface MinimalSupabase {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
}

/**
 * Returns the active person for the authenticated user.
 * If preferredPersonId is supplied (from the active_person_id cookie),
 * it verifies the user has access and returns that person.
 * Falls back to the first accessible person.
 */
export async function getCurrentPerson(
  supabase: MinimalSupabase,
  userId: string,
  preferredPersonId?: string | null
): Promise<PersonRow | null> {
  // Fetch all accessible persons for this user
  const { data: access } = await supabase
    .from("person_access")
    .select("person_id")
    .eq("user_id", userId);

  const accessible = (access as Array<{ person_id: string }> | null) ?? [];
  if (!accessible.length) return null;

  const accessibleIds = accessible.map((a) => a.person_id);

  // Use preferred if it's in the accessible set
  const targetId =
    preferredPersonId && accessibleIds.includes(preferredPersonId)
      ? preferredPersonId
      : accessibleIds[0];

  const { data } = await supabase
    .from("persons")
    .select("*")
    .eq("id", targetId)
    .single();

  return data as PersonRow | null;
}

/**
 * Returns all persons the authenticated user has access to,
 * with their role.
 */
export async function getAllPersons(
  supabase: MinimalSupabase,
  userId: string
): Promise<Array<PersonRow & { role: string }>> {
  const { data: access } = await supabase
    .from("person_access")
    .select("person_id, role")
    .eq("user_id", userId);

  const rows = (access as Array<{ person_id: string; role: string }> | null) ?? [];
  if (!rows.length) return [];

  const ids = rows.map((r) => r.person_id);
  const { data: persons } = await supabase
    .from("persons")
    .select("*")
    .in("id", ids);

  const personList = (persons as PersonRow[] | null) ?? [];
  return personList.map((p) => ({
    ...p,
    role: rows.find((r) => r.person_id === p.id)?.role ?? "viewer",
  }));
}
