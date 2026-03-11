"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/inicio", label: "Inicio", icon: "⌂" },
  { href: "/resultados", label: "Resultados", icon: "🏆" },
  { href: "/partidos", label: "Partidos", icon: "⚽" },
  { href: "/reglas", label: "Reglas", icon: "📋" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A3A6B] max-w-[430px] mx-auto"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="flex justify-around items-center h-16">
        {items.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== "/inicio" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-sm font-serif ${
                isActive ? "text-white bg-white/15" : "text-white/80"
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
