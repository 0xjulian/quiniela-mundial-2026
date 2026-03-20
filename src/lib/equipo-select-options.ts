import { NOMBRES_EQUIPOS_ORDENADOS } from "@/lib/constants";

/**
 * Lista completa de selecciones (legacy). Para eliminatoria admin usar
 * `opcionesSelectHuecoEliminatoria` en `knockout-slot-options.ts`.
 */
export function opcionesEquipoSelect(valorActual: string): string[] {
  const v = valorActual.trim();
  const base = [...NOMBRES_EQUIPOS_ORDENADOS];
  if (v && !base.includes(v)) return [v, ...base];
  return base;
}
