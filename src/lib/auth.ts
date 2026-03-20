// Dominio sintético pero con TLD válido para Supabase
const QUINIELA_EMAIL_SUFFIX = "@quiniela.app";

export function emailFromGroupAndUsername(groupCode: string, username: string): string {
  const safe = `${username}_${groupCode}`.replace(/\s+/g, "").toLowerCase();
  return `${safe}${QUINIELA_EMAIL_SUFFIX}`;
}

/** Convierte "usuario" a email interno para Supabase Auth (solo usuario + contraseña en la UI). */
export function emailFromUsername(username: string): string {
  const trimmed = username.trim();
  const soloUsuario = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  const safe = soloUsuario.replace(/\s+/g, "").replace(/@/g, "").toLowerCase() || "jugador";
  return `${safe}${QUINIELA_EMAIL_SUFFIX}`;
}
