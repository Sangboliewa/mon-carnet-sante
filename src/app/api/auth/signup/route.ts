import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  let email = "";
  let password = "";
  let firstName = "";
  let lastName = "";
  let role = "patient";

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    email = (formData.get("email") as string) ?? "";
    password = (formData.get("password") as string) ?? "";
    firstName = (formData.get("firstName") as string) ?? "";
    lastName = (formData.get("lastName") as string) ?? "";
    role = (formData.get("role") as string) ?? "patient";
  } else {
    const body = await req.json() as { email?: string; password?: string; firstName?: string; lastName?: string; role?: string };
    email = body.email ?? "";
    password = body.password ?? "";
    firstName = body.firstName ?? "";
    lastName = body.lastName ?? "";
    role = body.role ?? "patient";
  }

  if (!email || !password || !firstName) {
    return NextResponse.redirect(new URL("/signup?error=missing_fields", req.url));
  }

  // Capture cookies set by Supabase SSR explicitly
  const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach((c) => cookiesToSet.push(c));
        },
      },
    }
  );

  // 1. Créer le compte
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName, last_name: lastName } },
  });

  if (signUpError || !data.user) {
    const msg = encodeURIComponent(signUpError?.message ?? "Erreur création compte");
    return NextResponse.redirect(new URL(`/signup?error=${msg}`, req.url));
  }

  // 2. Connexion immédiate si pas de confirmation email
  let userId = data.user.id;
  let sessionSet = !!data.session;

  if (!data.session) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInError && signInData.session) {
      userId = signInData.user.id;
      sessionSet = true;
    }
  }

  if (!sessionSet) {
    // Email confirmation required — redirect to login with confirmation notice
    return NextResponse.redirect(new URL("/login?confirm=true", req.url));
  }

  // 3. Créer le profil person
  await supabase.from("persons").insert({
    created_by: userId,
    first_name: firstName,
    last_name: lastName,
  });

  // Redirect based on role
  const afterSignup = role === "doctor" ? "/espace-medecin?new=1" : "/bienvenue";
  const response = NextResponse.redirect(new URL(afterSignup, req.url));
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
