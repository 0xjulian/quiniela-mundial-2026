import type { Partido } from "@/types/db";
import type { GrupoLetter } from "@/lib/constants";
import {
  gruposComplete,
  isPhaseComplete,
  tablasRealesPorGrupo,
  mejoresTercerosOrdenados,
  partidoTieneMarcadorReal,
  type TerceroRanked,
} from "@/lib/tournament-phase";

export type PartidoNombreUpdate = {
  id: string;
  equipo_local: string;
  equipo_visitante: string;
};

const RE_LUGAR_GRUPO = /^([12])[°º]\s*Grupo\s*([A-L])$/i;
const RE_TERCERO_POOL = /^3[°º]\s*(.+)$/i;
const RE_WINNER = /^W\(M(\d+)\)$/i;
const RE_GAN = /^Gan\.\s*M(\d+)$/i;
const RE_PERD = /^Perd\.\s*M(\d+)$/i;

export function getMatchWinnerName(p: Partido): string | null {
  if (!partidoTieneMarcadorReal(p)) return null;
  const gl = p.goles_local_real!;
  const gv = p.goles_visitante_real!;
  if (gl > gv) return p.equipo_local;
  if (gv > gl) return p.equipo_visitante;
  if (p.avanza_local_real === true) return p.equipo_local;
  if (p.avanza_local_real === false) return p.equipo_visitante;
  if (p.ganador_equipo && p.ganador_equipo.trim()) return p.ganador_equipo.trim();
  return null;
}

export function getMatchLoserName(p: Partido): string | null {
  const w = getMatchWinnerName(p);
  if (!w) return null;
  return w === p.equipo_local ? p.equipo_visitante : p.equipo_local;
}

function parseGrupoPlace(
  label: string,
  tablas: ReturnType<typeof tablasRealesPorGrupo>
): string | null {
  const m = label.trim().match(RE_LUGAR_GRUPO);
  if (!m) return null;
  const lugar = parseInt(m[1], 10) as 1 | 2;
  const g = m[2].toUpperCase() as GrupoLetter;
  const tabla = tablas[g];
  if (!tabla || tabla.length < lugar) return null;
  return tabla[lugar - 1]?.equipo ?? null;
}

function resolveThirdPlaceLabel(
  label: string,
  top8: TerceroRanked[],
  usedThirdTeams: Set<string>
): string | null {
  const m = label.trim().match(RE_TERCERO_POOL);
  if (!m) return null;
  const body = m[1].trim();
  const pool = body
    .split("/")
    .map((s) => s.trim().toUpperCase())
    .filter((p): p is GrupoLetter => /^[A-L]$/.test(p));
  if (!pool.length) return null;
  for (const row of top8) {
    if (!pool.includes(row.grupo)) continue;
    if (usedThirdTeams.has(row.equipo)) continue;
    return row.equipo;
  }
  return null;
}

function resolveWinnerToken(label: string, byMatchNo: Map<number, Partido>): string | null {
  const m = label.trim().match(RE_WINNER);
  if (!m) return null;
  const num = parseInt(m[1], 10);
  const mp = byMatchNo.get(num);
  if (!mp) return null;
  return getMatchWinnerName(mp);
}

function resolveGanPerdLabel(label: string, byMatchNo: Map<number, Partido>): string | null {
  const t = label.trim();
  const g = t.match(RE_GAN);
  if (g) {
    const num = parseInt(g[1], 10);
    const mp = byMatchNo.get(num);
    return mp ? getMatchWinnerName(mp) : null;
  }
  const pe = t.match(RE_PERD);
  if (pe) {
    const num = parseInt(pe[1], 10);
    const mp = byMatchNo.get(num);
    return mp ? getMatchLoserName(mp) : null;
  }
  return null;
}

function syncDieciseisavos(
  die: Partido[],
  tablas: ReturnType<typeof tablasRealesPorGrupo>
): PartidoNombreUpdate[] {
  const top8 = mejoresTercerosOrdenados(tablas);
  const used = new Set<string>();
  const sorted = [...die].sort((a, b) => (a.match_no ?? 0) - (b.match_no ?? 0));
  const out: PartidoNombreUpdate[] = [];
  for (const p of sorted) {
    let L = p.equipo_local;
    let V = p.equipo_visitante;
    if (RE_LUGAR_GRUPO.test(L.trim())) {
      const x = parseGrupoPlace(L, tablas);
      if (x) L = x;
    }
    if (RE_LUGAR_GRUPO.test(V.trim())) {
      const x = parseGrupoPlace(V, tablas);
      if (x) V = x;
    }
    if (RE_TERCERO_POOL.test(L.trim())) {
      const x = resolveThirdPlaceLabel(L, top8, used);
      if (x) {
        L = x;
        used.add(x);
      }
    }
    if (RE_TERCERO_POOL.test(V.trim())) {
      const x = resolveThirdPlaceLabel(V, top8, used);
      if (x) {
        V = x;
        used.add(x);
      }
    }
    if (L !== p.equipo_local || V !== p.equipo_visitante) {
      out.push({ id: p.id, equipo_local: L, equipo_visitante: V });
    }
  }
  return out;
}

function syncWAndGanPerd(p: Partido, byMatchNo: Map<number, Partido>): PartidoNombreUpdate | null {
  let L = p.equipo_local;
  let V = p.equipo_visitante;
  if (RE_WINNER.test(L.trim())) {
    const w = resolveWinnerToken(L, byMatchNo);
    if (w) L = w;
  }
  if (RE_WINNER.test(V.trim())) {
    const w = resolveWinnerToken(V, byMatchNo);
    if (w) V = w;
  }
  const rL = resolveGanPerdLabel(L, byMatchNo);
  if (rL) L = rL;
  const rV = resolveGanPerdLabel(V, byMatchNo);
  if (rV) V = rV;
  if (L !== p.equipo_local || V !== p.equipo_visitante) {
    return { id: p.id, equipo_local: L, equipo_visitante: V };
  }
  return null;
}

function virtualMap(partidos: Partido[]): Map<string, Partido> {
  return new Map(partidos.map((p) => [p.id, { ...p }]));
}

function byMatchNoFromVirtual(v: Map<string, Partido>): Map<number, Partido> {
  const m = new Map<number, Partido>();
  for (const p of v.values()) {
    if (p.match_no != null) m.set(p.match_no, p);
  }
  return m;
}

function applyUpdates(v: Map<string, Partido>, ups: PartidoNombreUpdate[]) {
  for (const u of ups) {
    const p = v.get(u.id);
    if (p) {
      p.equipo_local = u.equipo_local;
      p.equipo_visitante = u.equipo_visitante;
    }
  }
}

function diffVsOriginal(original: Partido[], v: Map<string, Partido>): PartidoNombreUpdate[] {
  const out: PartidoNombreUpdate[] = [];
  for (const o of original) {
    const n = v.get(o.id);
    if (!n) continue;
    if (n.equipo_local !== o.equipo_local || n.equipo_visitante !== o.equipo_visitante) {
      out.push({ id: o.id, equipo_local: n.equipo_local, equipo_visitante: n.equipo_visitante });
    }
  }
  return out;
}

/**
 * Nombres de equipo según resultados (1°/2°/3°, W(M#), Gan./Perd.).
 */
export function computeBracketNombreUpdates(partidos: Partido[]): PartidoNombreUpdate[] {
  if (!gruposComplete(partidos)) return [];

  const grupos = partidos.filter((p) => p.fase === "grupos" && p.match_no != null);
  const tablas = tablasRealesPorGrupo(grupos);
  const v = virtualMap(partidos);

  const die = partidos.filter((p) => p.fase === "dieciseisavos" && p.match_no != null);
  applyUpdates(v, syncDieciseisavos(die, tablas));

  let byMatchNo = byMatchNoFromVirtual(v);

  const roundUpdates: PartidoNombreUpdate[] = [];

  if (isPhaseComplete(partidos, "dieciseisavos")) {
    for (const p of partidos.filter((x) => x.fase === "octavos")) {
      const cur = v.get(p.id)!;
      const u = syncWAndGanPerd(cur, byMatchNo);
      if (u) roundUpdates.push(u);
    }
  }
  applyUpdates(v, roundUpdates);
  byMatchNo = byMatchNoFromVirtual(v);
  roundUpdates.length = 0;

  if (isPhaseComplete(partidos, "octavos")) {
    for (const p of partidos.filter((x) => x.fase === "cuartos")) {
      const cur = v.get(p.id)!;
      const u = syncWAndGanPerd(cur, byMatchNo);
      if (u) roundUpdates.push(u);
    }
  }
  applyUpdates(v, roundUpdates);
  byMatchNo = byMatchNoFromVirtual(v);
  roundUpdates.length = 0;

  if (isPhaseComplete(partidos, "cuartos")) {
    for (const p of partidos.filter((x) => x.fase === "semifinales")) {
      const cur = v.get(p.id)!;
      const u = syncWAndGanPerd(cur, byMatchNo);
      if (u) roundUpdates.push(u);
    }
  }
  applyUpdates(v, roundUpdates);
  byMatchNo = byMatchNoFromVirtual(v);
  roundUpdates.length = 0;

  if (isPhaseComplete(partidos, "semifinales")) {
    for (const p of partidos.filter((x) => x.fase === "tercero" || x.fase === "final")) {
      const cur = v.get(p.id)!;
      const u = syncWAndGanPerd(cur, byMatchNo);
      if (u) roundUpdates.push(u);
    }
  }
  applyUpdates(v, roundUpdates);

  return diffVsOriginal(partidos, v);
}
