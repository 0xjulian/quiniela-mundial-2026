"use client";

import { useUser } from "@/context/UserContext";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, profileError } = useUser();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F2ED] font-serif text-[#0A0A0A]">
        Cargando...
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F2ED] p-6 font-serif text-[#0A0A0A]">
        <p className="mb-4 text-center text-sm text-[#C8392B]">{profileError}</p>
        <button
          type="button"
          onClick={async () => {
            await createClient().auth.signOut();
            router.replace("/login");
            router.refresh();
          }}
          className="rounded-lg bg-[#1A3A6B] px-4 py-2 text-white"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
