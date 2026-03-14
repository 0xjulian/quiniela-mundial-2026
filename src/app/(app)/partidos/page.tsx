"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import type { Partido } from "@/types/db";
import { useUser } from "@/context/UserContext";
import { GRUPOS, EQUIPOS_POR_GRUPO, BANDERAS_POR_EQUIPO } from "@/lib/constants";
import type { GrupoLetter } from "@/lib/constants";
import { calcularTabla, type TablaRow } from "@/lib/tabla";

const formatFechaISO = (d: string) => {
  const [year, month, day] = d.split("-").map(Number);
  const fecha = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1));
  return fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

const formatFechaCorta = (d: string) => {
  const [year, month, day] = d.split("-").map(Number);
  const fecha = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1));
  return fecha.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

export default function PartidosPage() {
  const { user } = useUser();
  const esAdmin = !!user?.es_admin;

  const [grupo, setGrupo] = useState<GrupoLetter>("A");
  const [showMejores, setShowMejores] = useState(false);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [edicionResultados, setEdicionResultados] = useState<
    Record<string, { gl: string; gv: string; saving?: boolean }>
  >({});
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partidos")
        .select("*")
        .eq("fase", "grupos")
        .not("match_no", "is", null)
        .order("match_no", { nullsFirst: false })
        .order("fecha")
        .order("hora");
      const lista = (data as Partido[]) ?? [];
      setPartidos(lista);
      // Inicializar inputs de edición (para admins)
      setEdicionResultados(
        lista.reduce(
          (acc, p) => {
            acc[p.id] = {
              gl:
                p.goles_local_real !== null && p.goles_local_real !== undefined
                  ? String(p.goles_local_real)
                  : "",
              gv:
                p.goles_visitante_real !== null && p.goles_visitante_real !== undefined
                  ? String(p.goles_visitante_real)
                  : "",
            };
            return acc;
          },
          {} as Record<string, { gl: string; gv: string }>
        )
      );
      setLoading(false);
    })();
  }, []);

  const guardarResultado = async (id: string) => {
    const actual = edicionResultados[id] ?? { gl: "", gv: "" };
    const gl = actual.gl.trim();
    const gv = actual.gv.trim();

    const glNum = gl === "" ? null : Number(gl);
    const gvNum = gv === "" ? null : Number(gv);

    setEdicionResultados((prev) => ({
      ...prev,
      [id]: { ...prev[id], saving: true },
    }));

    const { error } = await supabase
      .from("partidos")
      .update({
        goles_local_real: glNum,
        goles_visitante_real: gvNum,
        cerrado: glNum !== null && gvNum !== null,
      })
      .eq("id", id);

    if (error) {
      setEdicionResultados((prev) => ({
        ...prev,
        [id]: { ...prev[id], saving: false },
      }));
      return;
    }

    setPartidos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              goles_local_real: glNum,
              goles_visitante_real: gvNum,
              cerrado: glNum !== null && gvNum !== null,
            }
          : p
      )
    );
    setEdicionResultados((prev) => ({
      ...prev,
      [id]: { ...prev[id], saving: false },
    }));
  };

  if (loading) return <div className="p-4 font-serif">Cargando…</div>;

  const formatHora = (h: string | null) =>
    h ? new Date(`2000-01-01T${h}`).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "–";

  const partidosGrupo = partidos.filter((p) => p.grupo === grupo);
  const equiposGrupo = EQUIPOS_POR_GRUPO[grupo];

  // Tablas reales por grupo (a partir de resultados cargados)
  const tablasPorGrupo: Record<GrupoLetter, TablaRow[]> = GRUPOS.reduce((acc, g) => {
    const partidosG = partidos.filter((p) => p.grupo === g);
    const jugados = partidosG.filter(
      (p) => p.goles_local_real != null && p.goles_visitante_real != null
    );
    const tabla = calcularTabla(
      jugados.map((p) => ({
        equipo_local: p.equipo_local,
        equipo_visitante: p.equipo_visitante,
        goles_local: p.goles_local_real ?? 0,
        goles_visitante: p.goles_visitante_real ?? 0,
      })),
      EQUIPOS_POR_GRUPO[g]
    );
    acc[g] = tabla;
    return acc;
  }, {} as Record<GrupoLetter, TablaRow[]>);

  const tablaReal = tablasPorGrupo[grupo];
  const partidosConResultadoGrupo = partidosGrupo.filter(
    (p) => p.goles_local_real != null && p.goles_visitante_real != null
  );

  // Mejores terceros (top 8 de los 12 terceros)
  const terceros = GRUPOS.map((g) => {
    const t = tablasPorGrupo[g];
    if (!t || t.length < 3) return null;
    return { grupo: g, ...t[2] };
  }).filter(Boolean) as Array<TablaRow & { grupo: GrupoLetter }>;

  const tercerosOrdenados = [...terceros].sort(
    (a, b) =>
      b.Pts - a.Pts ||
      b.DG - a.DG ||
      b.GF - a.GF
  );

  const mejoresTercerosSet = new Set(
    tercerosOrdenados.slice(0, 8).map((t) => `${t.grupo}-${t.equipo}`)
  );

  return (
    <div className="p-4 pb-8">
      {/* Selector de grupo + Mejores terceros */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {GRUPOS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setGrupo(g);
              setShowMejores(false);
            }}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-serif text-sm font-medium transition-colors ${
              !showMejores && grupo === g ? "bg-[#1A3A6B] text-white" : "bg-[#E8E3DC] text-[#0A0A0A]/80"
            }`}
          >
            Grupo {g}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowMejores(true)}
          className={`flex-shrink-0 px-4 py-2 rounded-full font-serif text-sm font-medium transition-colors ${
            showMejores ? "bg-[#1A3A6B] text-white" : "bg-[#E8E3DC] text-[#0A0A0A]/80"
          }`}
        >
          Mejores terceros
        </button>
      </div>

      {!showMejores && (
      <>
      {/* Tabla REAL del grupo */}
      <section className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4 mb-6 overflow-x-auto">
        <h2 className="font-serif font-bold text-[#0A0A0A] mb-3">Tabla real — Grupo {grupo}</h2>
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
            {tablaReal.map((row, i) => {
              const esTop2 = i < 2;
              const esMejorTercero =
                i === 2 && mejoresTercerosSet.has(`${grupo}-${row.equipo}`);
              const rowHighlight = esTop2
                ? "bg-[#1A3A6B]/10" // clasificados directos (1.º y 2.º) en azul un poco más notorio
                : esMejorTercero
                ? "bg-[#D4A843]/20" // mejor tercero clasificado en amarillo suave
                : "";
              return (
                <tr
                  key={row.equipo}
                  className={`border-b border-[#E8E3DC]/60 ${rowHighlight}`}
                >
                  <td className="py-2 pr-2 text-center font-mono font-semibold">{i + 1}</td>
                  <td className="py-2 pr-2 font-serif">
                    {BANDERAS_POR_EQUIPO[row.equipo] && (
                      <span className="mr-2">{BANDERAS_POR_EQUIPO[row.equipo]}</span>
                    )}
                    {row.equipo}
                  </td>
                  <td className="py-2 px-1 text-center">{row.PJ}</td>
                  <td className="py-2 px-1 text-center">{row.G}</td>
                  <td className="py-2 px-1 text-center">{row.E}</td>
                  <td className="py-2 px-1 text-center">{row.P}</td>
                  <td className="py-2 px-1 text-center">{row.GF}</td>
                  <td className="py-2 px-1 text-center">{row.GC}</td>
                  <td
                    className={`py-2 px-1 text-center font-mono font-semibold ${
                      row.DG > 0 ? "text-[#2D6A4F]" : row.DG < 0 ? "text-[#C8392B]" : ""
                    }`}
                  >
                    {row.DG > 0 ? `+${row.DG}` : row.DG}
                  </td>
                  <td className="py-2 pl-1 text-center font-mono font-semibold">{row.Pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {partidosConResultadoGrupo.length === 0 && (
          <p className="mt-3 text-xs text-[#0A0A0A]/60 font-serif">
            Aún no hay resultados cargados para este grupo.
          </p>
        )}
      </section>

      {/* Partidos del grupo */}
      <section className="space-y-4">
        <h2 className="font-serif font-bold text-[#0A0A0A]">Partidos — Grupo {grupo}</h2>
        {partidosGrupo.map((p) => {
          const tieneResultado = p.goles_local_real != null && p.goles_visitante_real != null;
          const edicion = edicionResultados[p.id] ?? { gl: "", gv: "", saving: false };
          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-mono text-[#0A0A0A]/60">
                  {p.match_no ? `M${p.match_no}` : ""}
                </span>
                <span className="text-xs font-serif text-[#1A3A6B] font-medium">
                  {formatFechaCorta(p.fecha)} {p.hora ? `· ${p.hora} CT` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-serif flex-1 text-center text-[#0A0A0A]">
                  {BANDERAS_POR_EQUIPO[p.equipo_local] && (
                    <span className="mr-2">{BANDERAS_POR_EQUIPO[p.equipo_local]}</span>
                  )}
                  {p.equipo_local}
                </span>
                <div className="font-mono text-xl font-bold px-2 text-[#1A3A6B]">
                  {tieneResultado ? (
                    <span>
                      {p.goles_local_real} vs {p.goles_visitante_real}
                    </span>
                  ) : (
                    <span className="text-[#0A0A0A]/70 text-base">VS</span>
                  )}
                </div>
                <span className="font-serif flex-1 text-center text-[#0A0A0A]">
                  {BANDERAS_POR_EQUIPO[p.equipo_visitante] && (
                    <span className="mr-2">{BANDERAS_POR_EQUIPO[p.equipo_visitante]}</span>
                  )}
                  {p.equipo_visitante}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#0A0A0A]/70 font-serif">
                <span aria-hidden>📍</span>
                <span>
                  {(p.estadio || p.ciudad)
                    ? [p.estadio, p.ciudad].filter(Boolean).join(" — ")
                    : "–"}
                </span>
              </div>
              {/* Bloque admin para cargar/editar resultados reales */}
              {esAdmin && (
                <div className="mt-3 pt-3 border-t border-[#E8E3DC]">
                  <div className="flex items-center justify-between gap-2 text-xs font-serif">
                    <span className="text-[#0A0A0A]/70">Editar resultado real (modo admin)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        className="w-10 rounded border border-[#E8E3DC] px-1 py-0.5 text-center font-mono"
                        value={edicion.gl}
                        onChange={(e) =>
                          setEdicionResultados((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], gl: e.target.value },
                          }))
                        }
                      />
                      <span className="font-mono text-[#0A0A0A]/70">-</span>
                      <input
                        type="number"
                        min={0}
                        className="w-10 rounded border border-[#E8E3DC] px-1 py-0.5 text-center font-mono"
                        value={edicion.gv}
                        onChange={(e) =>
                          setEdicionResultados((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], gv: e.target.value },
                          }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => guardarResultado(p.id)}
                        disabled={edicion.saving}
                        className="ml-2 rounded-md bg-[#1A3A6B] px-3 py-1 text-[11px] text-white font-medium disabled:opacity-60"
                      >
                        {edicion.saving ? "Guardando…" : "Guardar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {!esAdmin && !tieneResultado && (
                <div className="mt-3 pt-3 border-t border-[#E8E3DC]">
                  <span className="inline-block w-full py-2 rounded-lg bg-[#E8E3DC] text-[#0A0A0A]/70 text-center text-sm font-serif">
                    Resultado pendiente
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {partidosGrupo.length === 0 && (
          <p className="text-[#0A0A0A]/60 font-serif text-center py-4">
            Aún no hay partidos cargados para este grupo.
          </p>
        )}
      </section>
      </>
      )}

      {/* Mejores terceros (tabla general) */}
      {showMejores && (
      <section className="mt-4 bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4 overflow-x-auto">
        <h2 className="font-serif font-bold text-[#0A0A0A] mb-3">Mejores terceros (8 de 12)</h2>
        <table className="w-full text-left font-mono text-sm">
          <thead>
            <tr className="border-b border-[#E8E3DC]">
              <th className="py-2 pr-2 w-10 text-center">Pos</th>
              <th className="py-2 pr-2 font-serif">Equipo</th>
              <th className="py-2 px-1 text-center">Grp</th>
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
            {tercerosOrdenados.map((row, i) => {
              const esClasificado = i < 8; // primeros 8 avanzan
              return (
                <tr
                  key={`${row.grupo}-${row.equipo}`}
                  className={`border-b border-[#E8E3DC]/60 ${
                    esClasificado ? "bg-[#1A3A6B]/10" : ""
                  }`}
                >
                  <td className="py-2 pr-2 text-center font-mono font-semibold">{i + 1}</td>
                  <td className="py-2 pr-2 font-serif">
                    {BANDERAS_POR_EQUIPO[row.equipo] && (
                      <span className="mr-2">{BANDERAS_POR_EQUIPO[row.equipo]}</span>
                    )}
                    {row.equipo}
                  </td>
                  <td className="py-2 px-1 text-center">{row.grupo}</td>
                  <td className="py-2 px-1 text-center">{row.PJ}</td>
                  <td className="py-2 px-1 text-center">{row.G}</td>
                  <td className="py-2 px-1 text-center">{row.E}</td>
                  <td className="py-2 px-1 text-center">{row.P}</td>
                  <td className="py-2 px-1 text-center">{row.GF}</td>
                  <td className="py-2 px-1 text-center">{row.GC}</td>
                  <td
                    className={`py-2 px-1 text-center font-mono font-semibold ${
                      row.DG > 0 ? "text-[#2D6A4F]" : row.DG < 0 ? "text-[#C8392B]" : ""
                    }`}
                  >
                    {row.DG > 0 ? `+${row.DG}` : row.DG}
                  </td>
                  <td className="py-2 pl-1 text-center font-mono font-semibold">{row.Pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tercerosOrdenados.length === 0 && (
          <p className="mt-3 text-xs text-[#0A0A0A]/60 font-serif">
            La tabla de mejores terceros se calculará cuando haya resultados en todos los grupos.
          </p>
        )}
      </section>
      )}
    </div>
  );
}
