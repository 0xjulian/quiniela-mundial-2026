"use client";

/**
 * Supabase auth (refresh / session) can reject with network errors that become
 * unhandledrejection — Next.js dev overlay counts each as a separate "issue".
 * We mark them handled so the overlay does not spam 6–8 identical errors.
 */
export function registerSupabaseDevRejectionSuppression(): void {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") return;
  const w = window as Window & { __quinielaSupabaseRejectionHook?: boolean };
  if (w.__quinielaSupabaseRejectionHook) return;
  w.__quinielaSupabaseRejectionHook = true;

  function isSupabaseAuthNetworkNoise(reason: unknown): boolean {
    if (reason == null) return false;
    if (typeof reason === "string") {
      return /failed to fetch|network|load failed|authretryable/i.test(reason);
    }
    if (typeof reason === "object") {
      const o = reason as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name : "";
      const message = typeof o.message === "string" ? o.message : "";
      if (name === "AuthRetryableFetchError") return true;
      if (name === "TypeError" && /failed to fetch/i.test(message)) return true;
      if (name === "AbortError" && /lock broken|steal/i.test(message)) return true;
      if (/failed to fetch|networkerror|load failed/i.test(message)) return true;
    }
    return false;
  }

  let lastLog = 0;
  window.addEventListener(
    "unhandledrejection",
    (e: PromiseRejectionEvent) => {
      if (!isSupabaseAuthNetworkNoise(e.reason)) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastLog > 8000) {
        lastLog = now;
        console.warn(
          "[Supabase] Fallo de red o sesión (suprimido en overlay). Revisa internet y .env.local."
        );
      }
    },
    { capture: true }
  );
}
