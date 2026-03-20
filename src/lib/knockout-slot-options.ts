import type { Partido } from "@/types/db";
import type { GrupoLetter } from "@/lib/constants";
import { getMatchLoserName, getMatchWinnerName } from "@/lib/bracket-sync";
import { seedLabelForMatch } from "@/lib/knockout-seed-labels";
import { tablasRealesPorGrupo, partidoTieneMarcadorReal } from "@/lib/tournament-phase";

const RE_LUGAR_GRUPO = /^([12])[°º]\s*Grupo\s*([A-L])$/i;
const RE_TERCERO_POOL = /^3[°º]\s*(.+)$/i;
const RE_WINNER = /^W\(M(\d+)\)$/i;
const RE_GAN = /^Gan\.\s*M(\d+)$/i;
const RE_PERD = /^Perd\.\s*M(\d+)$/i;

function grupoCompleto(partidosGrupos: Partido[], g: GrupoLetter): boolean {
  const list = partidosGrupos.filter((p) => p.grupo === g);
  if (list.length === 0) return false;
  return list.every(partidoTieneMarcadorReal);
}

function canonicalLugarGrupo(lugar: 1 | 2, g: GrupoLetter): string {
  return `${lugar}° Grupo ${g}`;
}

function byMatchNo(partidos: Partido[]): Map<number, Partido> {
  const m = new Map<number, Partido>();
  for (const p of partidos) {
    if (p.match_no != null) m.set(p.match_no, p);
  }
  return m;
}

function pushUnique(out: string[], s: string) {
  const t = s.trim();
  if (t && !out.includes(t)) out.push(t);
}

/**
 * Opciones para el selector admin de un hueco de eliminatoria:
 * - 1°/2° Grupo X → placeholder canónico + equipo resuelto si el grupo ya cerró.
 * - 3° A/B/… → el texto del pool + terceros reales de esos grupos cuando ya cerraron.
 * - W(M#), Gan. M#, Perd. M# → token + ganador/perdedor si el partido ya tiene marcador.
 * - Cualquier otro valor (equipo fijado a mano) → solo ese valor.
 */
export function opcionesHuecoEliminatoria(label: string, todosPartidos: Partido[]): string[] {
  const raw = label.trim();
  const out: string[] = [];
  if (!raw) return out;

  const partidosGrupos = todosPartidos.filter((p) => p.fase === "grupos");
  const tablas = tablasRealesPorGrupo(partidosGrupos);
  const byMn = byMatchNo(todosPartidos);

  pushUnique(out, raw);

  const mLugar = raw.match(RE_LUGAR_GRUPO);
  if (mLugar) {
    const lugar = parseInt(mLugar[1], 10) as 1 | 2;
    const g = mLugar[2].toUpperCase() as GrupoLetter;
    pushUnique(out, canonicalLugarGrupo(lugar, g));
    if (grupoCompleto(partidosGrupos, g)) {
      const tabla = tablas[g];
      const idx = lugar - 1;
      if (tabla?.[idx]) pushUnique(out, tabla[idx].equipo);
    }
    return out;
  }

  if (RE_TERCERO_POOL.test(raw)) {
    const m3 = raw.match(RE_TERCERO_POOL)!;
    const body = m3[1].trim();
    const tokens = body
      .split("/")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    for (const t of tokens) {
      if (!/^[A-L]$/.test(t)) continue;
      const g = t as GrupoLetter;
      if (grupoCompleto(partidosGrupos, g)) {
        const tabla = tablas[g];
        if (tabla && tabla.length >= 3) pushUnique(out, tabla[2].equipo);
      }
    }
    return out;
  }

  const mW = raw.match(RE_WINNER);
  if (mW) {
    const n = parseInt(mW[1], 10);
    const p = byMn.get(n);
    if (p && partidoTieneMarcadorReal(p)) {
      const w = getMatchWinnerName(p);
      if (w) pushUnique(out, w);
    }
    return out;
  }

  const mGan = raw.match(RE_GAN);
  if (mGan) {
    const n = parseInt(mGan[1], 10);
    const p = byMn.get(n);
    if (p && partidoTieneMarcadorReal(p)) {
      const w = getMatchWinnerName(p);
      if (w) pushUnique(out, w);
    }
    return out;
  }

  const mPerd = raw.match(RE_PERD);
  if (mPerd) {
    const n = parseInt(mPerd[1], 10);
    const p = byMn.get(n);
    if (p && partidoTieneMarcadorReal(p)) {
      const loser = getMatchLoserName(p);
      if (loser) pushUnique(out, loser);
    }
    return out;
  }

  return out;
}

function mergeOpcionesOrdered(...lists: string[][]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const x of list) {
      const t = x.trim();
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/**
 * Opciones para un &lt;select&gt; admin: calendario (seed) + valor en BD + borrador,
 * sin mezclar con equipos de otros huecos.
 */
export function opcionesSelectHuecoEliminatoria(
  partido: Pick<Partido, "match_no" | "equipo_local" | "equipo_visitante">,
  side: "local" | "visitante",
  draftValue: string,
  todosPartidos: Partido[]
): string[] {
  const dbVal = side === "local" ? partido.equipo_local : partido.equipo_visitante;
  const seed = seedLabelForMatch(partido.match_no, side);
  const draft = draftValue.trim() || dbVal;
  return mergeOpcionesOrdered(
    seed ? opcionesHuecoEliminatoria(seed, todosPartidos) : [],
    opcionesHuecoEliminatoria(dbVal, todosPartidos),
    opcionesHuecoEliminatoria(draft, todosPartidos)
  );
}
