"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";
import LanguageSwitcher from "./LanguageSwitcher";

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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
      <div className="max-w-md mx-auto">
        {/* Switcher langue */}
        <div className="flex justify-end px-4 pt-1">
          <LanguageSwitcher />
        </div>
        <div className="flex justify-around items-center h-14 px-2">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
                  active ? "text-health-blue" : "text-gray-500"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className={`text-[9px] font-medium leading-tight text-center ${active ? "text-health-blue" : "text-gray-500"}`}>
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
