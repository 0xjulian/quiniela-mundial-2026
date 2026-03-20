import Image from "next/image";

/**
 * Todos los iconos del BottomNav comparten caja lógica (object-contain).
 * Tamaños en px para Next/Image + clases para que ocupen el mismo “slot” visual.
 */
const IMG_BASE = 64;

const iconClass = (filled?: boolean) => (filled ? "opacity-100" : "opacity-80");

/** Misma caja que el resto; Inicio ~10% más pequeño dentro del slot */
export function HomeIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/estadio.png"
      alt="Inicio"
      width={IMG_BASE}
      height={IMG_BASE}
      className={`object-contain max-h-[31px] max-w-[31px] h-[31px] w-[31px] ${iconClass(filled)}`}
    />
  );
}

export function TrophyIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/worldcup.png"
      alt="Tabla"
      width={IMG_BASE}
      height={IMG_BASE}
      className={`object-contain max-h-[34px] max-w-[34px] h-[34px] w-[34px] ${iconClass(filled)}`}
    />
  );
}

export function BallIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/silbato.png"
      alt="Partidos"
      width={IMG_BASE}
      height={IMG_BASE}
      className={`object-contain max-h-[34px] max-w-[34px] h-[34px] w-[34px] ${iconClass(filled)}`}
    />
  );
}

export function MarcadorIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/marcador.png"
      alt="Resultados"
      width={IMG_BASE}
      height={IMG_BASE}
      className={`object-contain max-h-[34px] max-w-[34px] h-[34px] w-[34px] ${iconClass(filled)}`}
    />
  );
}

export function RulesIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/reglas.png"
      alt="Reglas"
      width={IMG_BASE}
      height={IMG_BASE}
      className={`object-contain max-h-[34px] max-w-[34px] h-[34px] w-[34px] ${iconClass(filled)}`}
    />
  );
}

/** Ligas: mismo slot que el nav pero asset más grande (líneas finas del PNG) */
export function GroupIcon({ filled }: { filled?: boolean }) {
  return (
    <Image
      src="/ligas.png"
      alt="Ligas"
      width={IMG_BASE}
      height={IMG_BASE}
      className={`object-contain max-h-[44px] max-w-[44px] h-[44px] w-[44px] ${iconClass(filled)}`}
    />
  );
}
