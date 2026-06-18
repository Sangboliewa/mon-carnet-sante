import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { I18nProvider, type Locale } from "@/lib/i18n/context";
import OfflineBanner from "@/components/OfflineBanner";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Mon Carnet Santé",
  description: "Votre carnet de santé numérique personnel",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Carnet Santé",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E6FBF",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const initialLocale: Locale = localeCookie === "en" ? "en" : "fr";

  return (
    <html lang={initialLocale} className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <I18nProvider initialLocale={initialLocale}>
          <OfflineBanner />
          {children}
        </I18nProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
