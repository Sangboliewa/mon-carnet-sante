import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  let email = "";
  let password = "";

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    email = (formData.get("email") as string) ?? "";
    password = (formData.get("password") as string) ?? "";
  } else {
    const body = await req.json() as { email?: string; password?: string };
    email = body.email ?? "";
    password = body.password ?? "";
  }

  const redirectTo = req.nextUrl.searchParams.get("redirect") ?? "/dashboard";

  if (!email || !password) {
    return NextResponse.redirect(new URL(`/login?error=missing_fields&redirect=${encodeURIComponent(redirectTo)}`, req.url));
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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return NextResponse.redirect(
      new URL(`/login?error=invalid_credentials&redirect=${encodeURIComponent(redirectTo)}`, req.url)
    );
  }

  // Redirect to dashboard — set session cookies explicitly on the redirect response
  // This ensures Android WebView's navigation cookie jar receives the cookies
  const response = NextResponse.redirect(new URL(redirectTo, req.url));
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}
