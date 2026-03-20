import Image from "next/image";

const NAV_ICON_SIZE = 32;

const iconClass = (filled?: boolean) => (filled ? "opacity-100" : "opacity-80");

export function HomeIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/estadio.png"
      alt="Inicio"
      width={NAV_ICON_SIZE}
      height={NAV_ICON_SIZE}
      className={`object-contain ${iconClass(filled)}`}
    />
  );
}

export function TrophyIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/worldcup.png"
      alt="Tabla"
      width={NAV_ICON_SIZE}
      height={NAV_ICON_SIZE}
      className={`object-contain ${iconClass(filled)}`}
    />
  );
}

export function BallIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/silbato.png"
      alt="Partidos"
      width={NAV_ICON_SIZE}
      height={NAV_ICON_SIZE}
      className={`object-contain ${iconClass(filled)}`}
    />
  );
}

export function MarcadorIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/marcador.png"
      alt="Resultados"
      width={NAV_ICON_SIZE}
      height={NAV_ICON_SIZE}
      className={`object-contain ${iconClass(filled)}`}
    />
  );
}

export function RulesIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/reglas.png"
      alt="Reglas"
      width={NAV_ICON_SIZE}
      height={NAV_ICON_SIZE}
      className={`object-contain scale-125 ${iconClass(filled)}`}
    />
  );
}

