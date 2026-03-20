"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import type { PrivateLeagueRow } from "@/types/db";

interface LeaderboardRow {
  id: string;
  username: string;
  puntos_totales: number;
  exactos: number;
  correctos: number;
  dinero: number;
  posicion: number;
}

type TablaScope = { kind: "general" } | { kind: "league"; league: PrivateLeagueRow };

export default function ResultadosPage() {
  const { user } = useUser();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ligas, setLigas] = useState<PrivateLeagueRow[]>([]);
  const [scope, setScope] = useState<TablaScope>({ kind: "general" });
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const loadLigas = useCallback(async () => {
    if (!user?.id) {
      setLigas([]);
      return;
    }
    const { data, error: e } = await supabase.rpc("my_private_leagues");
    if (e) {
      setLigas([]);
      return;
    }
    const raw = (data ?? []) as Array<{
      id: string;
      name: string;
      invite_code: string;
      member_count: number | string;
      is_creator: boolean;
    }>;
    setLigas(
      raw.map((r) => ({
        id: r.id,
        name: r.name,
        invite_code: r.invite_code,
        member_count: Number(r.member_count),
        is_creator: r.is_creator,
      }))
    );
  }, [user?.id, supabase]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setTableLoading(false);
      return;
    }
    setTableLoading(true);
    setError(null);

    if (scope.kind === "general") {
      const { data, error: rpcError } = await supabase.rpc("get_leaderboard");
      if (rpcError) {
        setError(rpcError.message || "No se pudo cargar la tabla.");
        setRows([]);
        setTableLoading(false);
        return;
      }
      const raw = (data ?? []) as Array<{
        id: string;
        username: string;
        puntos_totales: number;
        exactos: number;
        correctos: number;
      }>;
      const distribucion: Record<number, number> = { 1: 50, 2: 30, 3: 20 };
      const totalBote = 100;
      const withMoney: LeaderboardRow[] = raw.map((r, i) => ({
        id: r.id,
        username: r.username,
        puntos_totales: Number(r.puntos_totales),
        exactos: Number(r.exactos),
        correctos: Number(r.correctos),
        dinero: i < 3 ? (totalBote * (distribucion[i + 1] ?? 0)) / 100 : 0,
        posicion: i + 1,
      }));
      setRows(withMoney);
      setTableLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc("get_leaderboard_league", {
      p_league_id: scope.league.id,
    });
    if (rpcError) {
      setError(
        rpcError.message.includes("function") || rpcError.code === "42883"
          ? "Ejecuta 12-private-leagues.sql en Supabase para ver tablas por liga."
          : rpcError.message
      );
      setRows([]);
      setTableLoading(false);
      return;
    }
    const raw = (data ?? []) as Array<{
      id: string;
      username: string;
      puntos_totales: number;
      exactos: number;
      correctos: number;
    }>;
    const withMoney: LeaderboardRow[] = raw.map((r, i) => ({
      id: r.id,
      username: r.username,
      puntos_totales: Number(r.puntos_totales),
      exactos: Number(r.exactos),
      correctos: Number(r.correctos),
      dinero: 0,
      posicion: i + 1,
    }));
    setRows(withMoney);
    setTableLoading(false);
  }, [user?.id, supabase, scope]);

  useEffect(() => {
    void loadLigas();
  }, [loadLigas]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setTableLoading(false);
      return () => {};
    }
    load().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [user, load]);

  const myPos = rows.findIndex((r) => r.id === user?.id);
  const esLiga = scope.kind === "league";

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-serif text-xl font-extrabold text-[#021024] tracking-wide">Tabla</h1>
        <button
          type="button"
          onClick={() => {
            void loadLigas();
            void load();
          }}
          className="p-2 rounded-full text-[#1A3A6B] hover:bg-[#1A3A6B]/10"
          title="Actualizar"
          aria-label="Actualizar"
        >
          <span className="text-lg" aria-hidden>
            🔄
          </span>
        </button>
      </div>

      <p className="text-[10px] text-[#0A0A0A]/65 font-serif mb-3">
        <Link href="/ligas" className="text-[#0052FF] font-semibold underline">
          Ligas
        </Link>
        : crea o únete con código. La vista <strong>General</strong> es la quiniela con premio; las ligas son ranking
        entre amigos (mismos puntos).
      </p>

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        <button
          type="button"
          onClick={() => setScope({ kind: "general" })}
          className={`flex-shrink-0 px-3 py-2 rounded-full font-serif text-[11px] font-semibold ${
            scope.kind === "general" ? "bg-[#0052FF] text-white" : "bg-[#E0EAFF] text-[#00163A]/80"
          }`}
        >
          General
        </button>
        {ligas.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setScope({ kind: "league", league: l })}
            className={`flex-shrink-0 px-3 py-2 rounded-full font-serif text-[11px] font-semibold max-w-[140px] truncate ${
              scope.kind === "league" && scope.league.id === l.id
                ? "bg-[#1A3A6B] text-white"
                : "bg-[#E0EAFF] text-[#00163A]/80"
            }`}
            title={l.name}
          >
            {l.name}
          </button>
        ))}
      </div>

      {esLiga && (
        <p className="text-[10px] text-[#0A0A0A]/60 font-serif mb-2 rounded-lg bg-[#E8F0FF] px-2 py-1.5">
          Liga <strong>{scope.league.name}</strong> · sin reparto de premio oficial; solo posiciones entre miembros.
        </p>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-[#C8392B]/10 border border-[#C8392B]/30 px-3 py-2 text-sm text-[#C8392B] font-serif">
          {error}
        </div>
      )}

      {tableLoading ? (
        <p className="text-sm text-[#0A0A0A]/60 font-serif py-8 text-center">Cargando tabla…</p>
      ) : rows.length === 0 && !error ? (
        <p className="text-sm text-[#0A0A0A]/70 font-serif py-6 text-center">
          Aún no hay puntos cargados. La tabla se actualizará cuando se registren resultados.
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm overflow-hidden">
          <table className="w-full text-left font-serif text-sm">
            <thead>
              <tr className="bg-[#E8E3DC]/50 border-b border-[#E8E3DC]">
                <th className="py-3 pl-4 font-semibold text-[#0A0A0A]">POS</th>
                <th className="py-3 px-2 font-semibold text-[#0A0A0A]">USUARIO</th>
                <th className="py-3 px-2 text-center font-semibold text-[#0A0A0A]">PUNTOS</th>
                <th className="py-3 pr-4 text-right font-semibold text-[#0A0A0A]">
                  {esLiga ? "PREMIO" : "DINERO"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-[#E8E3DC]/60 ${
                    r.id === user?.id ? "bg-[#1A3A6B]/08" : ""
                  }`}
                >
                  <td className="py-3 pl-4">
                    {r.posicion <= 3 ? (
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full font-mono font-bold text-[#D4A843] bg-[#D4A843]/15">
                        {r.posicion}
                      </span>
                    ) : (
                      <span className="font-mono text-[#0A0A0A]">{r.posicion}</span>
                    )}
                  </td>
                  <td className="py-3 px-2">
                    {r.username}
                    {r.id === user?.id && (
                      <span className="ml-2 text-xs bg-[#1A3A6B] text-white px-1.5 py-0.5 rounded">TÚ</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-semibold text-[#0A0A0A]">
                    {r.puntos_totales}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono font-semibold text-[#2D6A4F]">
                    {esLiga ? "—" : `$${r.dinero}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {myPos >= 0 && rows.length > 0 && (
        <p className="mt-4 text-sm text-[#0A0A0A]/70 font-serif">
          Tu posición: <strong className="font-mono">#{myPos + 1}</strong>
        </p>
      )}
    </div>
  );
}
