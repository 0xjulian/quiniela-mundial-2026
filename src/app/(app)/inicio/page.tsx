"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { GRUPOS, EQUIPOS_POR_GRUPO, TODOS_LOS_EQUIPOS } from "@/lib/constants";
import type { GrupoLetter } from "@/lib/constants";
import { calcularTabla } from "@/lib/tabla";
import type { Partido } from "@/types/db";

export default function InicioPage() {
  const { user } = useUser();
  const [grupo, setGrupo] = useState<GrupoLetter>("A");
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [predicciones, setPredicciones] = useState<Record<string, { goles_local: number; goles_visitante: number }>>({});
  const [campeon, setCampeon] = useState(user?.campeon_predicho ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createClient();
  const equipos = EQUIPOS_POR_GRUPO[grupo];

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partidos")
        .select("*")
        .eq("grupo", grupo)
        .eq("fase", "grupos")
        .order("fecha");
      setPartidos((data as Partido[]) ?? []);
    })();
  }, [grupo, supabase]);

  useEffect(() => {
    if (!user?.id || partidos.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("predicciones")
        .select("partido_id, goles_local, goles_visitante")
        .eq("user_id", user.id)
        .in("partido_id", partidos.map((p) => p.id));
      const map: Record<string, { goles_local: number; goles_visitante: number }> = {};
      for (const r of data ?? []) {
        map[r.partido_id] = { goles_local: r.goles_local, goles_visitante: r.goles_visitante };
      }
      setPredicciones(map);
    })();
  }, [user?.id, partidos, supabase]);

  useEffect(() => {
    if (user?.campeon_predicho) setCampeon(user.campeon_predicho);
  }, [user?.campeon_predicho]);

  const partidosConPred = partidos.map((p) => ({
    equipo_local: p.equipo_local,
    equipo_visitante: p.equipo_visitante,
    goles_local: predicciones[p.id]?.goles_local ?? 0,
    goles_visitante: predicciones[p.id]?.goles_visitante ?? 0,
  }));
  const tabla = calcularTabla(partidosConPred, equipos);

  const guardar = async () => {
    if (!user?.id) return;
    setSaving(true);
    setMessage("");
    try {
      for (const p of partidos) {
        const pred = predicciones[p.id];
        if (pred === undefined) continue;
        await supabase.from("predicciones").upsert(
          {
            user_id: user.id,
            partido_id: p.id,
            goles_local: pred.goles_local,
            goles_visitante: pred.goles_visitante,
          },
          { onConflict: "user_id,partido_id" }
        );
      }
      await supabase.from("users").update({ campeon_predicho: campeon || null }).eq("id", user.id);
      setMessage("Predicciones guardadas.");
    } catch {
      setMessage("Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const aprobado = user?.aprobado && user?.pagado;

  return (
    <div className="p-4 pb-8">
      {/* Selector de grupo — pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {GRUPOS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrupo(g)}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-serif text-sm font-medium transition-colors ${
              grupo === g
                ? "bg-[#1A3A6B] text-white"
                : "bg-[#E8E3DC] text-[#0A0A0A]/80"
            }`}
          >
            Grupo {g}
          </button>
        ))}
      </div>

      {/* Tabla de posiciones predicha */}
      <section className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4 mb-6 overflow-x-auto">
        <h2 className="font-serif font-bold text-[#0A0A0A] mb-3">Grupo {grupo}</h2>
        <table className="w-full text-left font-mono text-sm">
          <thead>
            <tr className="border-b border-[#E8E3DC]">
              <th className="py-2 pr-2 w-10 text-center">Pos</th>
              <th className="py-2 pr-2 font-serif">Equipo</th>
              <th className="py-2 px-1 text-center">PJ</th>
              <th className="py-2 px-1 text-center">G</th>
              <th className="py-2 px-1 text-center">E</th>
              <th className="py-2 px-1 text-center">P</th>
              <th className="py-2 px-1 text-center">GF</th>
              <th className="py-2 px-1 text-center">GC</th>
              <th className="py-2 px-1 text-center">DG</th>
              <th className="py-2 pl-1 text-center font-semibold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {tabla.map((row, i) => (
              <tr
                key={row.equipo}
                className={`border-b border-[#E8E3DC]/60 ${i === 1 ? "bg-[#1A3A6B]/05" : ""}`}
              >
                <td className="py-2 pr-2 text-center font-mono font-semibold">{i + 1}</td>
                <td className="py-2 pr-2 font-serif">{row.equipo}</td>
                <td className="py-2 px-1 text-center">{row.PJ}</td>
                <td className="py-2 px-1 text-center">{row.G}</td>
                <td className="py-2 px-1 text-center">{row.E}</td>
                <td className="py-2 px-1 text-center">{row.P}</td>
                <td className="py-2 px-1 text-center">{row.GF}</td>
                <td className="py-2 px-1 text-center">{row.GC}</td>
                <td className={`py-2 px-1 text-center font-mono font-semibold ${row.DG > 0 ? "text-[#2D6A4F]" : row.DG < 0 ? "text-[#C8392B]" : ""}`}>
                  {row.DG > 0 ? `+${row.DG}` : row.DG}
                </td>
                <td className="py-2 pl-1 text-center font-mono font-semibold">{row.Pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Haz tus Predicciones */}
      <section className="space-y-4 mb-6">
        <h2 className="font-serif font-bold text-[#0A0A0A]">Haz tus Predicciones — Grupo {grupo}</h2>
        {partidos.map((p, idx) => {
          const cerrado = p.cerrado;
          const pred = predicciones[p.id] ?? { goles_local: 0, goles_visitante: 0 };
          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4 pt-8 flex flex-col sm:flex-row items-center gap-3 relative"
            >
              <span className="absolute top-3 left-3 text-xs font-mono text-[#0A0A0A]/60">M{idx + 1}</span>
              <span className="absolute top-3 right-3 text-xs font-serif text-[#1A3A6B]">Grupo {grupo}</span>
              <div className="flex-1 text-center font-serif text-sm">{p.equipo_local}</div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={pred.goles_local}
                  onChange={(e) =>
                    setPredicciones((prev) => ({
                      ...prev,
                      [p.id]: { ...prev[p.id], goles_local: parseInt(e.target.value, 10) || 0 },
                    }))
                  }
                  disabled={!aprobado || cerrado}
                  className="w-12 text-center py-1 border border-[#E8E3DC] rounded font-mono text-lg"
                />
                <span className="font-mono text-[#0A0A0A]/60">–</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={pred.goles_visitante}
                  onChange={(e) =>
                    setPredicciones((prev) => ({
                      ...prev,
                      [p.id]: { ...prev[p.id], goles_visitante: parseInt(e.target.value, 10) || 0 },
                    }))
                  }
                  disabled={!aprobado || cerrado}
                  className="w-12 text-center py-1 border border-[#E8E3DC] rounded font-mono text-lg"
                />
              </div>
              <div className="flex-1 text-center font-serif text-sm">{p.equipo_visitante}</div>
              {p.goles_local_real != null && (
                <div className="text-xs text-[#0A0A0A]/60 font-mono">
                  Real: {p.goles_local_real}–{p.goles_visitante_real}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Campeón */}
      <section className="bg-white rounded-xl border border-[#E8E3DC] p-4 mb-6">
        <h2 className="font-serif font-semibold text-[#0A0A0A] mb-2">
          Tu campeón del Mundial (+5 pts)
        </h2>
        <select
          value={campeon}
          onChange={(e) => setCampeon(e.target.value)}
          disabled={!aprobado}
          className="w-full px-3 py-2 border border-[#E8E3DC] rounded-lg bg-white font-serif text-[#0A0A0A]"
        >
          <option value="">Elegir campeón</option>
          {TODOS_LOS_EQUIPOS.map(({ nombre }) => (
            <option key={nombre} value={nombre}>{nombre}</option>
          ))}
        </select>
      </section>

      {aprobado && (
        <button
          onClick={guardar}
          disabled={saving}
          className="w-full py-3 rounded-lg bg-[#1A3A6B] text-white font-serif font-medium disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar predicciones"}
        </button>
      )}
      {message && <p className="mt-2 text-sm font-serif text-[#2D6A4F]">{message}</p>}
    </div>
  );
}
