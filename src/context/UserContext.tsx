"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { registerSupabaseDevRejectionSuppression } from "@/lib/supabase-dev-rejection-suppression";
import type { User } from "@/types/db";

registerSupabaseDevRejectionSuppression();

const UserContext = createContext<{
  user: User | null;
  loading: boolean;
  profileError: string | null;
}>({
  user: null,
  loading: true,
  profileError: null,
});

const NETWORK_MSG =
  "No se pudo conectar con Supabase. Revisa internet, que el proyecto no esté pausado en supabase.com, y que .env.local tenga NEXT_PUBLIC_SUPABASE_URL y la clave correcta.";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const router = useRouter();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProfileError(null);
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        // Sesión rota en el navegador (token revocado, proyecto distinto, datos borrados)
        if (authError) {
          const m = (authError.message ?? "").toLowerCase();
          // Sin red / Supabase inalcanzable: no borrar sesión local; el usuario puede reintentar
          if (m.includes("failed to fetch") || m.includes("network") || m.includes("fetch")) {
            setProfileError(NETWORK_MSG);
            setLoading(false);
            return;
          }
          if (
            m.includes("refresh") ||
            m.includes("invalid") ||
            authError.status === 401
          ) {
            await supabase.auth.signOut({ scope: "local" });
            router.replace("/login");
            setLoading(false);
            return;
          }
          setProfileError(authError.message);
          setLoading(false);
          return;
        }

        if (!authUser) {
          router.replace("/login");
          setLoading(false);
          return;
        }

        // Cargar perfil vía RPC (bypass RLS) para evitar "no se pudo cargar"
        let { data: profile } = await supabase.rpc("get_my_profile");

        // Si no hay perfil, intentar crear una vez (usuario antiguo o sin backfill)
        if (!profile) {
          const username = (authUser.user_metadata as any)?.username ?? authUser.email?.split("@")[0] ?? "Jugador";
          await supabase.from("users").insert({
            id: authUser.id,
            username: String(username).trim() || "Jugador",
            grupo_code: "GLOBAL",
            aprobado: false,
            pagado: false,
            es_admin: false,
          }).then(() => {});
          const { data: afterInsert } = await supabase.rpc("get_my_profile");
          profile = afterInsert;
        }

        if (cancelled) return;
        if (!profile) {
          setProfileError("No se pudo cargar tu perfil. En Supabase ejecuta 04-triggers.sql y el backfill de 03-seed.sql, luego cierra sesión e intenta de nuevo.");
          setLoading(false);
          return;
        }
        setUser(profile as User | null);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        const low = message.toLowerCase();
        if (low.includes("refresh token") || low.includes("invalid refresh")) {
          await supabase.auth.signOut({ scope: "local" });
          router.replace("/login");
          setLoading(false);
          return;
        }
        const isNetwork = /failed to fetch|network|load failed/i.test(message);
        setProfileError(isNetwork ? NETWORK_MSG : "Error al cargar: " + message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <UserContext.Provider value={{ user, loading, profileError }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
