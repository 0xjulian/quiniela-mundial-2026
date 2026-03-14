// FIFA World Cup 2026 — 12 groups A–L, 4 teams each (48 teams)
// Source: Mundial_2026_Calendario_Definitivo.xlsx - Grupos.csv
export const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
export type GrupoLetter = (typeof GRUPOS)[number];

export const EQUIPOS_POR_GRUPO: Record<GrupoLetter, string[]> = {
  A: ['México', 'Sudáfrica', 'Corea del Sur', 'PO UEFA D'],
  B: ['Canadá', 'PO UEFA A', 'Qatar', 'Suiza'],
  C: ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
  D: ['Estados Unidos', 'Paraguay', 'Australia', 'PO UEFA C'],
  E: ['Alemania', 'Curazao', 'Costa de Marfil', 'Ecuador'],
  F: ['Países Bajos', 'Japón', 'PO UEFA B', 'Túnez'],
  G: ['Bélgica', 'Egipto', 'Irán', 'Nueva Zelanda'],
  H: ['España', 'Cabo Verde', 'Arabia Saudita', 'Uruguay'],
  I: ['Francia', 'Senegal', 'PO IC 2', 'Noruega'],
  J: ['Argentina', 'Argelia', 'Austria', 'Jordania'],
  K: ['Portugal', 'PO IC 1', 'Uzbekistán', 'Colombia'],
  L: ['Inglaterra', 'Croacia', 'Ghana', 'Panamá'],
};

export const BANDERAS_POR_EQUIPO: Record<string, string> = {
  // Grupo A
  'México': '🇲🇽',
  'Sudáfrica': '🇿🇦',
  'Corea del Sur': '🇰🇷',
  'PO UEFA D': '',
  // Grupo B
  'Canadá': '🇨🇦',
  'PO UEFA A': '',
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
  'PO UEFA C': '',
  // Grupo E
  'Alemania': '🇩🇪',
  'Curazao': '🇨🇼',
  'Costa de Marfil': '🇨🇮',
  'Ecuador': '🇪🇨',
  // Grupo F
  'Países Bajos': '🇳🇱',
  'Japón': '🇯🇵',
  'PO UEFA B': '',
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
  'PO IC 2': '',
  'Noruega': '🇳🇴',
  // Grupo J
  'Argentina': '🇦🇷',
  'Argelia': '🇩🇿',
  'Austria': '🇦🇹',
  'Jordania': '🇯🇴',
  // Grupo K
  'Portugal': '🇵🇹',
  'PO IC 1': '',
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

// Points
export const PUNTOS_EXACTO = 3;
export const PUNTOS_RESULTADO = 1;
export const PUNTOS_TABLA_POR_POSICION = 1;
export const PUNTOS_CAMPEON = 5;

// Match closure: 5 minutes before kickoff
export const MINUTOS_CIERRE_ANTES = 5;
