// FIFA World Cup 2026 — 12 groups A–L, 4 teams each (48 teams)
// Source: Mundial_2026_Calendario_Definitivo.xlsx - Grupos.csv
export const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
export type GrupoLetter = (typeof GRUPOS)[number];

export const EQUIPOS_POR_GRUPO: Record<GrupoLetter, string[]> = {
  A: ['México', 'Sudáfrica', 'Corea del Sur', 'República Checa'],
  B: ['Canadá', 'Bosnia y Herzegovina', 'Qatar', 'Suiza'],
  C: ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
  D: ['Estados Unidos', 'Paraguay', 'Australia', 'Turquía'],
  E: ['Alemania', 'Curazao', 'Costa de Marfil', 'Ecuador'],
  F: ['Países Bajos', 'Japón', 'Suecia', 'Túnez'],
  G: ['Bélgica', 'Egipto', 'Irán', 'Nueva Zelanda'],
  H: ['España', 'Cabo Verde', 'Arabia Saudita', 'Uruguay'],
  I: ['Francia', 'Senegal', 'Irak', 'Noruega'],
  J: ['Argentina', 'Argelia', 'Austria', 'Jordania'],
  K: ['Portugal', 'República Democrática del Congo', 'Uzbekistán', 'Colombia'],
  L: ['Inglaterra', 'Croacia', 'Ghana', 'Panamá'],
};

export const BANDERAS_POR_EQUIPO: Record<string, string> = {
  // Grupo A
  'México': '🇲🇽',
  'Sudáfrica': '🇿🇦',
  'Corea del Sur': '🇰🇷',
  'República Checa': '🇨🇿',
  // Grupo B
  'Canadá': '🇨🇦',
  'Bosnia y Herzegovina': '🇧🇦',
  'Qatar': '🇶🇦',
  'Suiza': '🇨🇭',
  // Grupo C
  'Brasil': '🇧🇷',
  'Marruecos': '🇲🇦',
  'Haití': '🇭🇹',
  'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  // Grupo D
  'Estados Unidos': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Australia': '🇦🇺',
  'Turquía': '🇹🇷',
  // Grupo E
  'Alemania': '🇩🇪',
  'Curazao': '🇨🇼',
  'Costa de Marfil': '🇨🇮',
  'Ecuador': '🇪🇨',
  // Grupo F
  'Países Bajos': '🇳🇱',
  'Japón': '🇯🇵',
  'Suecia': '🇸🇪',
  'Túnez': '🇹🇳',
  // Grupo G
  'Bélgica': '🇧🇪',
  'Egipto': '🇪🇬',
  'Irán': '🇮🇷',
  'Nueva Zelanda': '🇳🇿',
  // Grupo H
  'España': '🇪🇸',
  'Cabo Verde': '🇨🇻',
  'Arabia Saudita': '🇸🇦',
  'Uruguay': '🇺🇾',
  // Grupo I
  'Francia': '🇫🇷',
  'Senegal': '🇸🇳',
  'Irak': '🇮🇶',
  'Noruega': '🇳🇴',
  // Grupo J
  'Argentina': '🇦🇷',
  'Argelia': '🇩🇿',
  'Austria': '🇦🇹',
  'Jordania': '🇯🇴',
  // Grupo K
  'Portugal': '🇵🇹',
  'República Democrática del Congo': '🇨🇩',
  'Uzbekistán': '🇺🇿',
  'Colombia': '🇨🇴',
  // Grupo L
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croacia': '🇭🇷',
  'Ghana': '🇬🇭',
  'Panamá': '🇵🇦',
};

// All 48 team names for champion pick
export const TODOS_LOS_EQUIPOS = GRUPOS.flatMap((g) =>
  EQUIPOS_POR_GRUPO[g].map((n) => ({ nombre: n, grupo: g }))
);

/** Nombres únicos ordenados (dropdowns admin / campeón) */
export const NOMBRES_EQUIPOS_ORDENADOS = [
  ...new Set(GRUPOS.flatMap((g) => EQUIPOS_POR_GRUPO[g])),
].sort((a, b) => a.localeCompare(b, "es"));

/** Orden cronológico de rondas eliminatorias en DB */
export const FASES_ELIMINATORIA_ORDEN = [
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinales",
  "tercero",
  "final",
] as const;

export type FaseEliminatoria = (typeof FASES_ELIMINATORIA_ORDEN)[number];

export function etiquetaFaseEliminatoria(fase: string): string {
  const m: Record<string, string> = {
    dieciseisavos: "Dieciseisavos",
    octavos: "Octavos",
    cuartos: "Cuartos",
    semifinales: "Semifinales",
    tercero: "3er lugar",
    final: "Final",
  };
  return m[fase] ?? fase;
}

/** Etiquetas cortas para pills en móvil (Partidos / Resultados) */
export const ETIQUETA_FASE_TAB: Record<string, string> = {
  grupos: "Grupos",
  dieciseisavos: "16avos",
  octavos: "Octavos",
  cuartos: "Cuartos",
  semifinales: "Semis",
  tercero: "3er",
  final: "Final",
};

export type VistaPartidosFase = "grupos" | FaseEliminatoria;

// Points
export const PUNTOS_EXACTO = 3;
export const PUNTOS_RESULTADO = 1;
export const PUNTOS_TABLA_POR_POSICION = 1;
export const PUNTOS_CAMPEON = 5;
export const PUNTOS_GOLEADOR = 3;

// Primer partido del Mundial en horario CT (Ciudad de México)
// Formato: YYYY-MM-DDTHH:MM:SS
export const FECHA_PRIMER_PARTIDO_CT = "2026-06-11T13:00:00";

// Cierre genérico: minutos antes del inicio
export const MINUTOS_CIERRE_ANTES = 5;
