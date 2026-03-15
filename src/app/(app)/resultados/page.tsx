"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";

interface LeaderboardRow {
  id: string;
  username: string;
  puntos_totales: number;
  exactos: number;
  correctos: number;
  dinero: number;
  posicion: number;
}

export default function ResultadosPage() {
  const { user } = useUser();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  async function load() {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("get_leaderboard");
    if (rpcError) {
      setError(rpcError.message || "No se pudo cargar la tabla.");
      setRows([]);
      setLoading(false);
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
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLoading(false);
      return () => {};
    }
    load().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) return <div className="p-4 font-serif">Cargando…</div>;

  const myPos = rows.findIndex((r) => r.id === user?.id);

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-xl font-bold text-[#0A0A0A]">Resultados</h1>
        <button
          type="button"
          onClick={() => load()}
          className="p-2 rounded-full text-[#1A3A6B] hover:bg-[#1A3A6B]/10"
          title="Actualizar"
          aria-label="Actualizar"
        >
          <span className="text-lg" aria-hidden>🔄</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-[#C8392B]/10 border border-[#C8392B]/30 px-3 py-2 text-sm text-[#C8392B] font-serif">
          {error}
        </div>
      )}

      {/* Tabla leaderboard */}
      {rows.length === 0 && !error ? (
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
              <th className="py-3 pr-4 text-right font-semibold text-[#0A0A0A]">DINERO</th>
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
                    <span className="ml-2 text-xs bg-[#1A3A6B] text-white px-1.5 py-0.5 rounded">
                      TÚ
                    </span>
                  )}
                </td>
                <td className="py-3 px-2 text-center font-mono font-semibold text-[#0A0A0A]">{r.puntos_totales}</td>
                <td className="py-3 pr-4 text-right font-mono font-semibold text-[#2D6A4F]">${r.dinero}</td>
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
