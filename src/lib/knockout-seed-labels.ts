/**
 * Nombres originales del calendario (M73–M104), alineados con 11-seed-knockout-partidos.sql.
 * Sirven para armar opciones de admin aunque la BD ya tenga un equipo resuelto.
 */
export const KNOCKOUT_SEED_BY_MATCH: Record<
  number,
  { equipo_local: string; equipo_visitante: string }
> = {
  73: { equipo_local: "2° Grupo A", equipo_visitante: "2° Grupo B" },
  74: { equipo_local: "1° Grupo E", equipo_visitante: "3° A/B/C/D/F" },
  75: { equipo_local: "1° Grupo F", equipo_visitante: "2° Grupo C" },
  76: { equipo_local: "1° Grupo C", equipo_visitante: "2° Grupo F" },
  77: { equipo_local: "1° Grupo I", equipo_visitante: "3° C/D/F/G/H" },
  78: { equipo_local: "2° Grupo E", equipo_visitante: "2° Grupo I" },
  79: { equipo_local: "1° Grupo A", equipo_visitante: "3° C/E/F/H/I" },
  80: { equipo_local: "1° Grupo L", equipo_visitante: "3° E/H/I/J/K" },
  81: { equipo_local: "1° Grupo D", equipo_visitante: "3° B/E/F/I/J" },
  82: { equipo_local: "1° Grupo G", equipo_visitante: "3° A/E/H/I/J" },
  83: { equipo_local: "2° Grupo K", equipo_visitante: "2° Grupo L" },
  84: { equipo_local: "1° Grupo H", equipo_visitante: "2° Grupo J" },
  85: { equipo_local: "1° Grupo B", equipo_visitante: "3° E/F/G/I/J" },
  86: { equipo_local: "1° Grupo J", equipo_visitante: "2° Grupo H" },
  87: { equipo_local: "1° Grupo K", equipo_visitante: "3° D/E/I/J/L" },
  88: { equipo_local: "2° Grupo D", equipo_visitante: "2° Grupo G" },
  89: { equipo_local: "W(M74)", equipo_visitante: "W(M77)" },
  90: { equipo_local: "W(M73)", equipo_visitante: "W(M75)" },
  91: { equipo_local: "W(M76)", equipo_visitante: "W(M78)" },
  92: { equipo_local: "W(M79)", equipo_visitante: "W(M80)" },
  93: { equipo_local: "W(M83)", equipo_visitante: "W(M84)" },
  94: { equipo_local: "W(M81)", equipo_visitante: "W(M82)" },
  95: { equipo_local: "W(M86)", equipo_visitante: "W(M88)" },
  96: { equipo_local: "W(M85)", equipo_visitante: "W(M87)" },
  97: { equipo_local: "W(M89)", equipo_visitante: "W(M90)" },
  98: { equipo_local: "W(M93)", equipo_visitante: "W(M94)" },
  99: { equipo_local: "W(M91)", equipo_visitante: "W(M92)" },
  100: { equipo_local: "W(M95)", equipo_visitante: "W(M96)" },
  101: { equipo_local: "W(M97)", equipo_visitante: "W(M98)" },
  102: { equipo_local: "W(M99)", equipo_visitante: "W(M100)" },
  103: { equipo_local: "Perd. M101", equipo_visitante: "Perd. M102" },
  104: { equipo_local: "Gan. M101", equipo_visitante: "Gan. M102" },
};

export function seedLabelForMatch(
  matchNo: number | null | undefined,
  side: "local" | "visitante"
): string | null {
  if (matchNo == null) return null;
  const row = KNOCKOUT_SEED_BY_MATCH[matchNo];
  if (!row) return null;
  return side === "local" ? row.equipo_local : row.equipo_visitante;
}
