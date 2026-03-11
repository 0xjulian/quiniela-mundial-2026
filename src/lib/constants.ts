// FIFA World Cup 2026 — 12 groups A–L, 4 teams each (48 teams)
// Placeholder names; replace with actual qualified teams when known.
export const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
export type GrupoLetter = (typeof GRUPOS)[number];

export const EQUIPOS_POR_GRUPO: Record<GrupoLetter, string[]> = {
  A: ['Canadá', 'México', 'USA', 'TBD'],
  B: ['Argentina', 'TBD', 'TBD', 'TBD'],
  C: ['Brasil', 'TBD', 'TBD', 'TBD'],
  D: ['Francia', 'TBD', 'TBD', 'TBD'],
  E: ['Alemania', 'TBD', 'TBD', 'TBD'],
  F: ['España', 'TBD', 'TBD', 'TBD'],
  G: ['Inglaterra', 'TBD', 'TBD', 'TBD'],
  H: ['Portugal', 'TBD', 'TBD', 'TBD'],
  I: ['Bélgica', 'TBD', 'TBD', 'TBD'],
  J: ['Países Bajos', 'TBD', 'TBD', 'TBD'],
  K: ['Uruguay', 'TBD', 'TBD', 'TBD'],
  L: ['Italia', 'TBD', 'TBD', 'TBD'],
};

// All 48 team names for champion pick
export const TODOS_LOS_EQUIPOS = GRUPOS.flatMap((g) =>
  EQUIPOS_POR_GRUPO[g].map((n) => ({ nombre: n, grupo: g }))
);

// Points
export const PUNTOS_EXACTO = 3;
export const PUNTOS_RESULTADO = 1;
export const PUNTOS_TABLA_POR_POSICION = 1;
export const PUNTOS_CAMPEON = 5;

// Match closure: 5 minutes before kickoff
export const MINUTOS_CIERRE_ANTES = 5;
