"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });

    if (authError || !data.user) {
      setError(authError?.message ?? "Erreur lors de la création du compte.");
      setLoading(false);
      return;
    }

    // If email confirmation is enabled, session is null — sign in immediately
    let userId = data.user.id;
    if (!data.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError || !signInData.user) {
        setError("Compte créé. Vérifiez votre email pour confirmer votre compte, puis connectez-vous.");
        setLoading(false);
        return;
      }
      userId = signInData.user.id;
    }

    // Create the person record for the new user
    const { error: personError } = await supabase.from("persons").insert({
      created_by: userId,
      first_name: firstName,
      last_name: lastName,
    });

    setLoading(false);

    if (personError) {
      setError("Compte créé, mais erreur lors de la création du profil : " + personError.message);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🏥</div>
        <h1 className="text-2xl font-bold text-health-blue">Mon Carnet Santé</h1>
        <p className="text-gray-500 mt-1 text-sm">Créer votre carnet de santé</p>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Créer un compte</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="label">Prénom</label>
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-field"
                placeholder="Marie"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="label">Nom</label>
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-field"
                placeholder="Dupont"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="label">Adresse e-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="label">Mot de passe</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="8 caractères minimum"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? "Création…" : "Créer mon carnet"}
          </button>
        </form>
      </div>

      <p className="text-center mt-6 text-sm text-gray-600">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-health-blue font-semibold">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
