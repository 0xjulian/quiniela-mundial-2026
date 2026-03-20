"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import type { PrivateLeagueRow } from "@/types/db";

function LigasContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [ligas, setLigas] = useState<PrivateLeagueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombreNueva, setNombreNueva] = useState("");
  const [codigoUnir, setCodigoUnir] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canUse = user?.aprobado && user?.pagado;

  async function refresh() {
    if (!user?.id) {
      setLigas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.rpc("my_private_leagues");
    if (error) {
      setErr(
        error.message.includes("function") || error.code === "42883"
          ? "Falta ejecutar en Supabase el script 12-private-leagues.sql (ligas privadas)."
          : error.message
      );
      setLigas([]);
    } else {
      const rows = (data ?? []) as Array<{
        id: string;
        name: string;
        invite_code: string;
        member_count: number | string;
        is_creator: boolean;
      }>;
      setLigas(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          invite_code: r.invite_code,
          member_count: Number(r.member_count),
          is_creator: r.is_creator,
        }))
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [user?.id]);

  useEffect(() => {
    const pre = searchParams.get("join") ?? searchParams.get("code");
    if (pre) setCodigoUnir(pre.trim());
  }, [searchParams]);

  async function crearLiga(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (!nombreNueva.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_private_league", {
      p_name: nombreNueva.trim(),
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    const j = data as { invite_code?: string };
    setMsg(`Liga creada. Código: ${j?.invite_code ?? "—"}`);
    setNombreNueva("");
    await refresh();
  }

  async function unirse(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    if (!codigoUnir.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("join_private_league", {
      p_invite_code: codigoUnir.trim(),
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    const j = data as { name?: string };
    setMsg(`Te uniste a «${j?.name ?? "la liga"}».`);
    setCodigoUnir("");
    await refresh();
  }

  function copyCode(code: string) {
    void navigator.clipboard.writeText(code);
    setMsg("Código copiado al portapapeles.");
  }

  function shareUrl(code: string) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/ligas?join=${encodeURIComponent(code)}`;
  }

  return (
    <div className="p-4 pb-8 font-serif">
      <h1 className="text-xl font-extrabold text-[#021024] tracking-wide mb-1">Ligas con amigos</h1>
      <p className="text-[11px] text-[#0A0A0A]/70 mb-4 leading-relaxed">
        Misma quiniela y mismos puntos que la <strong>tabla general</strong>. Aquí ves ranking solo entre quienes
        están en tu liga. El <strong>premio oficial</strong> sigue siendo el de la tabla global (
        <strong>Tabla</strong>).
      </p>

      {!canUse && user && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          Cuando tu cuenta esté <strong>aprobada</strong> y con <strong>acceso activo</strong> podrás crear ligas y
          unirte por código.
        </div>
      )}

      {err && (
        <div className="mb-3 rounded-lg bg-[#C8392B]/10 border border-[#C8392B]/30 px-3 py-2 text-sm text-[#C8392B]">
          {err}
        </div>
      )}
      {msg && (
        <div className="mb-3 rounded-lg bg-[#0D7A3E]/10 border border-[#0D7A3E]/30 px-3 py-2 text-sm text-[#0D7A3E]">
          {msg}
        </div>
      )}

      <section className="space-y-4 mb-6">
        <h2 className="text-sm font-bold text-[#00163A] uppercase tracking-wide">Crear liga</h2>
        <form onSubmit={crearLiga} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Nombre (ej. Oficina, Primaria 95)"
            value={nombreNueva}
            onChange={(e) => setNombreNueva(e.target.value)}
            disabled={!canUse || busy}
            maxLength={100}
            className="rounded-xl border border-[#E0EAFF] px-3 py-2 text-sm bg-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canUse || busy || !nombreNueva.trim()}
            className="rounded-xl bg-[#0052FF] text-white font-semibold py-2.5 text-sm disabled:opacity-50"
          >
            Crear y obtener código
          </button>
        </form>

        <h2 className="text-sm font-bold text-[#00163A] uppercase tracking-wide pt-2">Unirme con código</h2>
        <form onSubmit={unirse} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Código de invitación"
            value={codigoUnir}
            onChange={(e) => setCodigoUnir(e.target.value.toUpperCase())}
            disabled={!canUse || busy}
            className="rounded-xl border border-[#E0EAFF] px-3 py-2 text-sm font-mono uppercase bg-white disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canUse || busy || !codigoUnir.trim()}
            className="rounded-xl border-2 border-[#0052FF] text-[#0052FF] font-semibold py-2.5 text-sm disabled:opacity-50"
          >
            Unirme
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-bold text-[#00163A] uppercase tracking-wide mb-3">Mis ligas</h2>
        {loading ? (
          <p className="text-sm text-[#0A0A0A]/60">Cargando…</p>
        ) : ligas.length === 0 ? (
          <p className="text-sm text-[#0A0A0A]/60">Aún no estás en ninguna liga. Crea una o pide un código a un amigo.</p>
        ) : (
          <ul className="space-y-3">
            {ligas.map((l) => (
              <li
                key={l.id}
                className="rounded-2xl border border-[#E0EAFF] bg-white shadow-sm p-4 space-y-2"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="font-bold text-[#021024]">{l.name}</p>
                    <p className="text-[11px] text-[#0A0A0A]/60">
                      {l.member_count} miembro{l.member_count === 1 ? "" : "s"}
                      {l.is_creator ? " · Tú la creaste" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="font-mono text-sm font-semibold bg-[#E8F0FF] px-2 py-1 rounded-lg text-[#0052FF]">
                    {l.invite_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode(l.invite_code)}
                    className="text-xs font-semibold text-[#1A3A6B] underline"
                  >
                    Copiar código
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(shareUrl(l.invite_code));
                      setMsg("Enlace de invitación copiado.");
                    }}
                    className="text-xs font-semibold text-[#1A3A6B] underline"
                  >
                    Copiar link
                  </button>
                </div>
                <p className="text-[10px] text-[#0A0A0A]/50 break-all">{shareUrl(l.invite_code)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-[10px] text-[#0A0A0A]/45">
        Ver ranking: pestaña <strong>Tabla</strong> → elige &quot;General&quot; o una de tus ligas.
      </p>
    </div>
  );
}

export default function LigasPage() {
  return (
    <Suspense fallback={<div className="p-4 font-serif">Cargando…</div>}>
      <LigasContent />
    </Suspense>
  );
}
