"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { User } from "@/types/db";

const UserContext = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.replace("/login");
        setLoading(false);
        return;
      }
      let { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (!profile && authUser.user_metadata?.grupo_code && authUser.user_metadata?.username) {
        await supabase.from("users").insert({
          id: authUser.id,
          username: authUser.user_metadata.username,
          grupo_code: authUser.user_metadata.grupo_code,
          aprobado: false,
          pagado: false,
          es_admin: false,
        });
        const { data: created } = await supabase.from("users").select("*").eq("id", authUser.id).single();
        profile = created;
      }
      setUser(profile as User | null);
      setLoading(false);
    })();
  }, [router, supabase.auth]);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
