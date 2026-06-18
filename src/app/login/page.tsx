"use client";
import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email ou mot de passe incorrect.",
  missing_fields: "Veuillez remplir tous les champs.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const errorParam = searchParams.get("error");
  const confirmParam = searchParams.get("confirm");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const serverError = errorParam ? (ERROR_MESSAGES[errorParam] ?? decodeURIComponent(errorParam)) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    // Submit as real HTML form POST — ensures WebView navigation cookie jar
    // receives the Set-Cookie headers from the redirect response (Android fix)
    formRef.current?.submit();
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Connexion</h2>

      {confirmParam && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-700">
          Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous.
        </div>
      )}

      {serverError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Real HTML form POST — action redirects to /dashboard with Set-Cookie */}
      <form
        ref={formRef}
        method="POST"
        action={`/api/auth/login?redirect=${encodeURIComponent(redirect)}`}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* Hidden inputs carry React state values when form.submit() is called */}
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="password" value={password} />

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
        🔒 Données sécurisées — Mon Carnet Santé
      </p>
    </div>
  );
}
