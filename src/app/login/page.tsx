"use client";
import { Suspense } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    window.location.href = redirect;
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Connexion</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🏥</div>
        <h1 className="text-2xl font-bold text-health-blue">Mon Carnet Santé</h1>
        <p className="text-gray-500 mt-1 text-sm">Votre carnet de santé numérique</p>
      </div>

      <Suspense fallback={
        <div className="card text-center text-gray-400 py-8">Chargement…</div>
      }>
        <LoginForm />
      </Suspense>

      <p className="text-center mt-6 text-sm text-gray-600">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="text-health-blue font-semibold">
          Créer un compte
        </Link>
      </p>

      <p className="text-center mt-4 text-xs text-gray-400">
        🔒 Données fictives — Version de démonstration terrain
      </p>
    </div>
  );
}
