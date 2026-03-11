// Calcula tabla de posiciones predicha a partir de predicciones de partidos del grupo

export interface TablaRow {
  equipo: string;
  PJ: number;
  G: number;
  E: number;
  P: number;
  GF: number;
  GC: number;
  DG: number;
  Pts: number;
}

interface MatchPred {
  equipo_local: string;
  equipo_visitante: string;
  goles_local: number;
  goles_visitante: number;
}

export function calcularTabla(partidosConPrediccion: MatchPred[], equipos: string[]): TablaRow[] {
  const stats: Record<string, { PJ: number; G: number; E: number; P: number; GF: number; GC: number }> = {};
  for (const eq of equipos) {
    stats[eq] = { PJ: 0, G: 0, E: 0, P: 0, GF: 0, GC: 0 };
  }

  for (const m of partidosConPrediccion) {
    const gl = m.goles_local;
    const gv = m.goles_visitante;
    if (gl === undefined || gv === undefined || (gl === 0 && gv === 0 && m.equipo_local)) continue;
    stats[m.equipo_local].PJ += 1;
    stats[m.equipo_local].GF += gl;
    stats[m.equipo_local].GC += gv;
    stats[m.equipo_visitante].PJ += 1;
    stats[m.equipo_visitante].GF += gv;
    stats[m.equipo_visitante].GC += gl;
    if (gl > gv) {
      stats[m.equipo_local].G += 1;
      stats[m.equipo_visitante].P += 1;
    } else if (gl < gv) {
      stats[m.equipo_visitante].G += 1;
      stats[m.equipo_local].P += 1;
    } else {
      stats[m.equipo_local].E += 1;
      stats[m.equipo_visitante].E += 1;
    }
  }

  const rows: TablaRow[] = equipos.map((equipo) => {
    const s = stats[equipo];
    const Pts = s.G * 3 + s.E;
    return {
      equipo,
      PJ: s.PJ,
      G: s.G,
      E: s.E,
      P: s.P,
      GF: s.GF,
      GC: s.GC,
      DG: s.GF - s.GC,
      Pts,
    };
  });

  rows.sort((a, b) => b.Pts - a.Pts || b.DG - a.DG || b.GF - a.GF);
  return rows;
}
