"use client";
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SignupForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const serverError = errorParam
    ? errorParam === "missing_fields"
      ? "Veuillez remplir tous les champs obligatoires."
      : decodeURIComponent(errorParam)
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !email || !password || password.length < 8) return;
    setLoading(true);
    // Submit as real HTML form POST — ensures WebView navigation cookie jar
    // receives the Set-Cookie headers from the redirect response (Android fix)
    formRef.current?.submit();
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Créer un compte</h2>

      {serverError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {/* Real HTML form POST — action redirects to /dashboard with Set-Cookie */}
      <form
        ref={formRef}
        method="POST"
        action="/api/auth/signup"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {/* Hidden inputs carry React state values when form.submit() is called */}
        <input type="hidden" name="firstName" value={firstName} />
        <input type="hidden" name="lastName" value={lastName} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="password" value={password} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="label">Prénom *</label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input-field"
              placeholder="Votre prénom"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="label">Nom</label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input-field"
              placeholder="Votre nom"
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="label">Adresse e-mail *</label>
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
          <label htmlFor="password" className="label">Mot de passe *</label>
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
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🏥</div>
        <h1 className="text-2xl font-bold text-health-blue">Mon Carnet Santé</h1>
        <p className="text-gray-500 mt-1 text-sm">Créer votre carnet de santé</p>
      </div>

      <Suspense fallback={
        <div className="card text-center text-gray-400 py-8">Chargement…</div>
      }>
        <SignupForm />
      </Suspense>

      <p className="text-center mt-6 text-sm text-gray-600">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-health-blue font-semibold">Se connecter</Link>
      </p>
    </div>
  );
}
