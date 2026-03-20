"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@/types/db";

const UserContext = createContext<{
  user: User | null;
  loading: boolean;
  profileError: string | null;
}>({
  user: null,
  loading: true,
  profileError: null,
});

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
        setProfileError(
          isNetwork
            ? "No se pudo conectar. Revisa tu conexión a internet y que .env.local tenga NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY correctos."
            : "Error al cargar: " + message
        );
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
