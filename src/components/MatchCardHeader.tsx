"use client";

import type { ReactNode } from "react";

const formatFechaCorta = (d: string) => {
  const [year, month, day] = d.split("-").map(Number);
  const fecha = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1));
  return fecha.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

const formatHoraCorta = (h: string | null) => (h ? h.slice(0, 5) : "");

export type MatchCardHeaderProps = {
  matchNoDisplay: string;
  phaseLabel: ReactNode;
  fecha: string;
  hora: string | null;
  /** e.g. "Predicciones cerradas" */
  extraRight?: ReactNode;
  /** M# color (default blue like Partidos) */
  matchNoClassName?: string;
  phaseClassName?: string;
  showCalendarIcon?: boolean;
};

/**
 * Fase / grupo debajo del número de partido; fecha y hora alineadas a la derecha.
 */
export function MatchCardHeader({
  matchNoDisplay,
  phaseLabel,
  fecha,
  hora,
  extraRight,
  matchNoClassName = "text-[#0052FF]",
  phaseClassName = "text-[#0052FF] font-semibold text-[10px] sm:text-xs leading-tight",
  showCalendarIcon = true,
}: MatchCardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-2 text-xs font-serif text-[#0A0A0A]/70">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className={`font-mono font-semibold ${matchNoClassName}`}>{matchNoDisplay}</span>
        <span className={phaseClassName}>{phaseLabel}</span>
      </div>
      <div className="flex flex-col items-end gap-1 text-right shrink-0 max-w-[65%] sm:max-w-none">
        <span className="inline-flex items-center gap-1 justify-end text-[#1A3A6B] font-medium">
          {showCalendarIcon && <span aria-hidden>📅</span>}
          <span>
            {formatFechaCorta(fecha)}
            {hora ? ` · ${formatHoraCorta(hora)} CT` : ""}
          </span>
        </span>
        {extraRight}
      </div>
    </div>
  );
}
