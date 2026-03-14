"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, TrophyIcon, BallIcon, RulesIcon } from "./Icons";

const items = [
  { href: "/inicio", label: "Inicio", icon: HomeIcon },
  { href: "/resultados", label: "Resultados", icon: TrophyIcon },
  { href: "/partidos", label: "Partidos", icon: BallIcon },
  { href: "/reglas", label: "Reglas", icon: RulesIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#1A3A6B] max-w-[430px] mx-auto"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="flex justify-around items-end h-16">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/inicio" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs font-sans ${
                isActive ? "text-white bg-white/10" : "text-white/80"
              }`}
            >
              <Icon filled={isActive} />
              <span className="mt-0.5 leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
