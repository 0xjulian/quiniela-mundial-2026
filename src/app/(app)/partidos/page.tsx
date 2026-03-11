"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import type { Partido } from "@/types/db";

export default function PartidosPage() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partidos")
        .select("*")
        .order("fecha")
        .order("hora");
      setPartidos((data as Partido[]) ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  if (loading) return <div className="p-4 font-serif">Cargando…</div>;

  const formatFecha = (d: string) =>
    new Date(d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const formatHora = (h: string | null) =>
    h ? new Date(`2000-01-01T${h}`).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "–";

  return (
    <div className="p-4 pb-8">
      <div className="space-y-4">
        {partidos.map((p, idx) => {
          const tieneResultado = p.goles_local_real != null;
          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-mono text-[#0A0A0A]/60">M{idx + 1}</span>
                <span className="text-xs font-serif text-[#1A3A6B] font-medium">Grupo {p.grupo}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-serif flex-1 text-center text-[#0A0A0A]">{p.equipo_local}</span>
                <div className="font-mono text-xl font-bold px-2 text-[#1A3A6B]">
                  {tieneResultado ? (
                    <span>{p.goles_local_real} vs {p.goles_visitante_real}</span>
                  ) : (
                    <span className="text-[#0A0A0A]/70 text-base">VS</span>
                  )}
                </div>
                <span className="font-serif flex-1 text-center text-[#0A0A0A]">{p.equipo_visitante}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#0A0A0A]/70 font-serif">
                <span aria-hidden>📅</span>
                <span>{formatFecha(p.fecha)} | {formatHora(p.hora)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#0A0A0A]/70 font-serif mt-1">
                <span aria-hidden>📍</span>
                <span>{p.ciudad ?? "–"}</span>
              </div>
              {!tieneResultado && (
                <div className="mt-3 pt-3 border-t border-[#E8E3DC]">
                  <span className="inline-block w-full py-2 rounded-lg bg-[#E8E3DC] text-[#0A0A0A]/70 text-center text-sm font-serif">
                    Resultado pendiente
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {partidos.length === 0 && (
        <p className="text-[#0A0A0A]/60 font-serif text-center py-8">
          Aún no hay partidos cargados. El administrador los añadirá.
        </p>
      )}
    </div>
  );
}
