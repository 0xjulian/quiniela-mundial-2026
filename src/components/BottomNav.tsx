"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, TrophyIcon, BallIcon, RulesIcon, MarcadorIcon } from "./Icons";

const items = [
  { href: "/inicio", label: "Inicio", icon: HomeIcon },
  { href: "/partidos", label: "Partidos", icon: BallIcon },
  { href: "/marcador-final", label: "Resultados", icon: MarcadorIcon },
  { href: "/resultados", label: "Tabla", icon: TrophyIcon },
  { href: "/reglas", label: "Reglas", icon: RulesIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#041C32]/95 backdrop-blur max-w-[430px] mx-auto"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="flex items-stretch h-16">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/inicio" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-2 text-[10px] font-sans ${
                isActive ? "text-white bg-white/10" : "text-white/80"
              }`}
            >
              <span className="flex items-center justify-center w-8 h-8 shrink-0 overflow-visible">
                <Icon filled={isActive} />
              </span>
              <span className="leading-none text-center truncate w-full px-0.5">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
