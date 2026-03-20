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
    <header className="bg-gradient-to-r from-[#0B1F3B] via-[#006A4E] to-[#D4A843] text-white px-4 py-3 flex items-center justify-between w-full">
      <div className="flex items-center gap-3 min-w-0">
        <Image
          src="/mundial_2026.png"
          alt="FIFA 2026"
          width={44}
          height={44}
          className="flex-shrink-0 object-contain drop-shadow-md"
        />
        <div className="min-w-0">
          <h1 className="font-serif font-extrabold text-lg leading-tight tracking-wide uppercase truncate">
            Quiniela Mundial
          </h1>
          <p className="font-serif text-white/90 text-xs truncate">
            FIFA World Cup 2026
          </p>
          {user && (
            <p className="font-serif text-[#FFF6D0] text-xs mt-0.5 truncate">
              ¡Hola, <span className="font-semibold">{user.username}</span>!
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="flex-shrink-0 font-serif text-[11px] px-3 py-1 rounded-full border border-white/70 bg-white/10 hover:bg-white/20 transition-colors"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
