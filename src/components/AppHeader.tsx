"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { createClient } from "@/lib/supabase";

export default function AppHeader() {
  const { user } = useUser();
  const router = useRouter();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="bg-[#1A3A6B] text-white px-4 py-3 flex items-center justify-between max-w-[430px] mx-auto w-full">
      <div className="flex items-center gap-3 min-w-0">
        <Image
          src="/mundial_2026.png"
          alt="FIFA 2026"
          width={40}
          height={40}
          className="flex-shrink-0 object-contain"
        />
        <div className="min-w-0">
          <h1 className="font-serif font-bold text-lg leading-tight truncate">
            Quiniela
          </h1>
          <p className="font-serif text-white/90 text-sm truncate">
            Mundial FIFA 2026
          </p>
          {user && (
            <p className="font-serif text-white/95 text-sm mt-0.5 truncate">
              ¡Hola, {user.username}!
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="flex-shrink-0 font-serif text-sm text-white underline hover:no-underline"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
