import Image from "next/image";

export function HomeIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/estadio.png"
      alt="Inicio"
      width={24}
      height={24}
      className={filled ? "" : "opacity-80"}
    />
  );
}

export function TrophyIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/worldcup.png"
      alt="Resultados"
      width={32}
      height={32}
      className={filled ? "" : "opacity-80"}
    />
  );
}

export function BallIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/silbato.png"
      alt="Partidos"
      width={32}
      height={32}
      className={filled ? "" : "opacity-80"}
    />
  );
}

export function RulesIcon({ filled }: { filled?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-8 h-8">
      <rect
        x="6"
        y="4"
        width="12"
        height="16"
        rx="1.5"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.6}
      />
      <path
        d="M9 8h6M9 11h4M9 14h3"
        stroke={filled ? "#FFFFFF" : "currentColor"}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

