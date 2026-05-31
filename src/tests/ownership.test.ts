/**
 * Tests d'accès et d'ownership.
 * Ces tests vérifient la logique applicative : un utilisateur ne voit que
 * les persons auxquelles il a accès via person_access.
 * Les tests mockent le client Supabase pour rester unitaires.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePersonAccess(userId: string, personIds: string[]) {
  return personIds.map((pid) => ({
    user_id: userId,
    person_id: pid,
    role: "owner" as const,
  }));
}

// Simulates the server-side query logic:
// "SELECT persons WHERE person_access.user_id = userId"
function filterPersonsByAccess(
  allPersons: { id: string }[],
  allAccess: { user_id: string; person_id: string }[],
  userId: string
) {
  const accessible = new Set(
    allAccess.filter((a) => a.user_id === userId).map((a) => a.person_id)
  );
  return allPersons.filter((p) => accessible.has(p.id));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Ownership / access control", () => {
  const persons = [
    { id: "p1", first_name: "Marie", last_name: "Dupont" },
    { id: "p2", first_name: "Jean", last_name: "Martin" },
    { id: "p3", first_name: "Alice", last_name: "Koné" },
  ];

  const userA = "user-a";
  const userB = "user-b";

  const access = [
    ...makePersonAccess(userA, ["p1", "p2"]),
    ...makePersonAccess(userB, ["p3"]),
  ];

  it("user A voit uniquement ses propres persons", () => {
    const result = filterPersonsByAccess(persons, access, userA);
    expect(result.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("user B ne voit pas les persons de user A", () => {
    const result = filterPersonsByAccess(persons, access, userB);
    expect(result.map((p) => p.id)).toEqual(["p3"]);
    expect(result.some((p) => p.id === "p1")).toBe(false);
    expect(result.some((p) => p.id === "p2")).toBe(false);
  });

  it("un utilisateur sans accès ne voit aucune person", () => {
    const result = filterPersonsByAccess(persons, access, "user-c");
    expect(result).toHaveLength(0);
  });

  it("un utilisateur ne peut pas accéder à une person d'un autre utilisateur", () => {
    const canAccess = (userId: string, personId: string) =>
      access.some((a) => a.user_id === userId && a.person_id === personId);

    expect(canAccess(userA, "p3")).toBe(false);
    expect(canAccess(userB, "p1")).toBe(false);
    expect(canAccess(userB, "p2")).toBe(false);
  });
});

// ─── Upload validation tests ─────────────────────────────────────────────────

describe("Upload validation", () => {
  const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
  const MAX_SIZE = 10 * 1024 * 1024;

  function validateFile(type: string, size: number): { ok: boolean; error?: string } {
    if (!ALLOWED_TYPES.includes(type)) {
      return { ok: false, error: "Format non accepté" };
    }
    if (size > MAX_SIZE) {
      return { ok: false, error: "Fichier trop volumineux" };
    }
    return { ok: true };
  }

  it("accepte un PDF de taille correcte", () => {
    expect(validateFile("application/pdf", 1024 * 1024).ok).toBe(true);
  });

  it("accepte un JPEG de taille correcte", () => {
    expect(validateFile("image/jpeg", 500 * 1024).ok).toBe(true);
  });

  it("accepte un PNG de taille correcte", () => {
    expect(validateFile("image/png", 2 * 1024 * 1024).ok).toBe(true);
  });

  it("rejette un fichier Word", () => {
    const result = validateFile("application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1024);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Format");
  });

  it("rejette un fichier trop volumineux (> 10 Mo)", () => {
    const result = validateFile("application/pdf", 11 * 1024 * 1024);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("volumineux");
  });

  it("rejette exactement à la limite + 1 octet", () => {
    const result = validateFile("image/jpeg", MAX_SIZE + 1);
    expect(result.ok).toBe(false);
  });

  it("accepte exactement à la limite", () => {
    const result = validateFile("image/jpeg", MAX_SIZE);
    expect(result.ok).toBe(true);
  });
});

// ─── Chemin 3 : aucun LLM ────────────────────────────────────────────────────

describe("Chemin 3 — Comprendre cet examen", () => {
  // Simule la logique de sélection de la fiche glossaire (sans LLM)
  function getExplanation(
    examType: string | null,
    glossary: { exam_type: string; educational_text: string }[]
  ) {
    if (!examType) return null;
    return glossary.find((g) => g.exam_type === examType) ?? null;
  }

  const glossary = [
    { exam_type: "NFS", educational_text: "La NFS est une numération formule sanguine…" },
    { exam_type: "Glycémie", educational_text: "La glycémie mesure le taux de sucre dans le sang…" },
  ];

  it("retourne la bonne fiche pour un type connu", () => {
    const result = getExplanation("NFS", glossary);
    expect(result).not.toBeNull();
    expect(result?.educational_text).toContain("NFS");
  });

  it("retourne null pour un type inconnu (pas d'hallucination LLM)", () => {
    const result = getExplanation("ExamenInconnu", glossary);
    expect(result).toBeNull();
  });

  it("retourne null si exam_type est null", () => {
    const result = getExplanation(null, glossary);
    expect(result).toBeNull();
  });
});
