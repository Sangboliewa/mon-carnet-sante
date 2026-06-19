"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

const NAV_ICONS = {
  "/dashboard":     { active: "🏠", inactive: "🏠" },
  "/antecedents":   { active: "📋", inactive: "📋" },
  "/consultations": { active: "🩺", inactive: "🩺" },
  "/urgence":       { active: "🆘", inactive: "🆘" },
  "/profil":        { active: "👤", inactive: "👤" },
};

export default function NavBar() {
  const pathname = usePathname();
  const { t } = useI18n();

  const NAV = [
    { href: "/dashboard",     label: t.nav.home,          icon: "🏠" },
    { href: "/antecedents",   label: t.nav.health,        icon: "📋" },
    { href: "/consultations", label: t.nav.consultations, icon: "🩺" },
    { href: "/urgence",       label: t.nav.emergency,     icon: "🆘" },
    { href: "/profil",        label: t.nav.profile,       icon: "👤" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-50 safe-area-pb shadow-[0_-1px_0_0_rgba(0,0,0,0.05)]">
      <div className="max-w-md mx-auto">
        <div className="flex justify-around items-center h-16 px-1">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-3 py-1 rounded-2xl relative"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-health-blue rounded-b-full" />
                )}
                <span className={`text-2xl transition-transform duration-150 ${active ? "scale-110" : "scale-100"}`}>
                  {item.icon}
                </span>
                <span className={`text-[9px] font-semibold leading-tight text-center tracking-wide transition-colors duration-150 ${active ? "text-health-blue" : "text-gray-400"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
