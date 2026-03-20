import type { Partido } from "@/types/db";
import {
  FASES_ELIMINATORIA_ORDEN,
  GRUPOS,
  EQUIPOS_POR_GRUPO,
  ETIQUETA_FASE_TAB,
} from "@/lib/constants";
import type { GrupoLetter } from "@/lib/constants";
import { calcularTabla, type TablaRow } from "@/lib/tabla";

/** Tabs en UI usuario (tercero + final juntos) */
export type UserFocusTabKey =
  | "grupos"
  | "dieciseisavos"
  | "octavos"
  | "cuartos"
  | "semifinales"
  | "finales";

export const USER_PHASE_TAB_ORDER: UserFocusTabKey[] = [
  "grupos",
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinales",
  "finales",
];

export function etiquetaUserTab(key: UserFocusTabKey): string {
  if (key === "finales") return "Finales";
  return ETIQUETA_FASE_TAB[key] ?? key;
}

export function partidoTieneMarcadorReal(p: Partido): boolean {
  return p.goles_local_real != null && p.goles_visitante_real != null;
}

export function isPhaseComplete(partidos: Partido[], fase: string): boolean {
  const list = partidos.filter((p) => p.fase === fase && p.match_no != null);
  if (list.length === 0) return false;
  return list.every(partidoTieneMarcadorReal);
}

export function gruposComplete(partidos: Partido[]): boolean {
  return isPhaseComplete(partidos, "grupos");
}

/** Fases KO que corresponden a la pestaña "Finales" (usuario) */
export function fasesEnTabFinales(): readonly string[] {
  return ["tercero", "final"];
}

/** Mapea pestaña usuario → fase(s) en DB */
export function fasesDbParaTabUsuario(tab: UserFocusTabKey): string[] {
  if (tab === "grupos") return ["grupos"];
  if (tab === "finales") return [...fasesEnTabFinales()];
  return [tab];
}

/**
 * Qué pestañas puede ver el usuario (look-back: fases ya existentes hasta la actual).
 */
export function getUserUnlockedTabs(partidos: Partido[]): UserFocusTabKey[] {
  const out: UserFocusTabKey[] = ["grupos"];
  if (!gruposComplete(partidos)) return out;
  out.push("dieciseisavos");
  if (!isPhaseComplete(partidos, "dieciseisavos")) return out;
  out.push("octavos");
  if (!isPhaseComplete(partidos, "octavos")) return out;
  out.push("cuartos");
  if (!isPhaseComplete(partidos, "cuartos")) return out;
  out.push("semifinales");
  if (!isPhaseComplete(partidos, "semifinales")) return out;
  out.push("finales");
  return out;
}

/**
 * Fase donde debe ponerse el foco (siguiente a completar o finales).
 */
export function getUserFocusTab(partidos: Partido[]): UserFocusTabKey {
  if (!gruposComplete(partidos)) return "grupos";
  if (!isPhaseComplete(partidos, "dieciseisavos")) return "dieciseisavos";
  if (!isPhaseComplete(partidos, "octavos")) return "octavos";
  if (!isPhaseComplete(partidos, "cuartos")) return "cuartos";
  if (!isPhaseComplete(partidos, "semifinales")) return "semifinales";
  return "finales";
}

/** Partidos a mostrar en una pestaña de usuario */
export function partidosParaTabUsuario(
  partidos: Partido[],
  tab: UserFocusTabKey
): Partido[] {
  const fases = fasesDbParaTabUsuario(tab);
  return partidos
    .filter((p) => fases.includes(p.fase) && p.match_no != null)
    .sort((a, b) => (a.match_no ?? 0) - (b.match_no ?? 0));
}

/** Tablas reales por grupo (para sync 1° / 2° / 3°) */
export function tablasRealesPorGrupo(partidosGrupos: Partido[]): Record<GrupoLetter, TablaRow[]> {
  return GRUPOS.reduce((acc, g) => {
    const partidosG = partidosGrupos.filter((p) => p.grupo === g);
    const jugados = partidosG.filter(partidoTieneMarcadorReal);
    const tabla = calcularTabla(
      jugados.map((p) => ({
        equipo_local: p.equipo_local,
        equipo_visitante: p.equipo_visitante,
        goles_local: p.goles_local_real ?? 0,
        goles_visitante: p.goles_visitante_real ?? 0,
      })),
      EQUIPOS_POR_GRUPO[g]
    );
    acc[g] = tabla;
    return acc;
  }, {} as Record<GrupoLetter, TablaRow[]>);
}

export type TerceroRanked = TablaRow & { grupo: GrupoLetter; rank: number };

/** Top 8 terceros (mismo criterio que Resultados / mejores terceros) */
export function mejoresTercerosOrdenados(
  tablasPorGrupo: Record<GrupoLetter, TablaRow[]>
): TerceroRanked[] {
  const terceros = GRUPOS.map((g) => {
    const t = tablasPorGrupo[g];
    if (!t || t.length < 3) return null;
    return { grupo: g, ...t[2] };
  }).filter(Boolean) as Array<TerceroRanked & { rank?: number }>;

  const sorted = [...terceros].sort(
    (a, b) => b.Pts - a.Pts || b.DG - a.DG || b.GF - a.GF
  );
  return sorted.slice(0, 8).map((row, i) => ({ ...row, rank: i }));
}

/** Todas las fases con `partidos` en la app (para SELECT / sync) */
export const TODAS_LAS_FASES_DB = ["grupos", ...FASES_ELIMINATORIA_ORDEN] as const;

export { FASES_ELIMINATORIA_ORDEN };
