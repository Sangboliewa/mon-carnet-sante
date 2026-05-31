"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Accueil", icon: "🏠" },
  { href: "/antecedents", label: "Santé", icon: "📋" },
  { href: "/agenda", label: "Agenda", icon: "📅" },
  { href: "/urgence", label: "Urgence", icon: "🆘" },
  { href: "/profil", label: "Profil", icon: "👤" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
                active ? "text-health-blue" : "text-gray-500"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`text-[10px] font-medium ${active ? "text-health-blue" : "text-gray-500"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
