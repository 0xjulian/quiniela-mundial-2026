const QUINIELA_EMAIL_SUFFIX = "@quiniela.local";

export function emailFromGroupAndUsername(groupCode: string, username: string): string {
  const safe = `${username}_${groupCode}`.replace(/\s+/g, "").toLowerCase();
  return `${safe}${QUINIELA_EMAIL_SUFFIX}`;
}

export function emailFromUsername(username: string): string {
  const trimmed = username.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  const safe = trimmed.replace(/\s+/g, "").toLowerCase();
  return `${safe}${QUINIELA_EMAIL_SUFFIX}`;
}
