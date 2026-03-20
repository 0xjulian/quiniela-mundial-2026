"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, TrophyIcon, BallIcon, RulesIcon, MarcadorIcon, GroupIcon } from "./Icons";

const items = [
  { href: "/inicio", label: "Inicio", icon: HomeIcon },
  { href: "/partidos", label: "Partidos", icon: BallIcon },
  { href: "/marcador-final", label: "Resultados", icon: MarcadorIcon },
  { href: "/resultados", label: "Tabla", icon: TrophyIcon },
  { href: "/ligas", label: "Ligas", icon: GroupIcon },
  { href: "/reglas", label: "Reglas", icon: RulesIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#041C32]/95 backdrop-blur max-w-[430px] mx-auto"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="flex items-stretch min-h-16">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/inicio" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-stretch flex-1 min-w-0 py-1.5 font-sans ${
                isActive ? "text-white bg-white/10" : "text-white/80"
              }`}
            >
              {/* Misma altura para todos los iconos; overflow visible por Ligas más grande */}
              <span className="flex h-[44px] w-full shrink-0 items-center justify-center overflow-visible">
                <Icon filled={isActive} />
              </span>
              {/* Texto en franja fija para alinear la línea base entre pestañas */}
              <span className="mt-0.5 flex h-[14px] w-full items-center justify-center px-0.5 text-center text-[9px] leading-none sm:text-[10px]">
                <span className="truncate w-full">{label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
