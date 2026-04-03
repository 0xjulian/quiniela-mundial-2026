"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Partido } from "@/types/db";
import { useUser } from "@/context/UserContext";
import {
  GRUPOS,
  EQUIPOS_POR_GRUPO,
  BANDERAS_POR_EQUIPO,
  etiquetaFaseEliminatoria,
} from "@/lib/constants";
import type { GrupoLetter } from "@/lib/constants";
import { calcularTabla, type TablaRow } from "@/lib/tabla";
import { computeBracketNombreUpdates } from "@/lib/bracket-sync";
import {
  TODAS_LAS_FASES_DB,
  getUserUnlockedTabs,
  getUserFocusTab,
  partidosParaTabUsuario,
  etiquetaUserTab,
  USER_PHASE_TAB_ORDER,
  type UserFocusTabKey,
} from "@/lib/tournament-phase";
import { MatchCardHeader } from "@/components/MatchCardHeader";
import { opcionesSelectHuecoEliminatoria } from "@/lib/knockout-slot-options";

export default function MarcadorFinalPage() {
  const { user } = useUser();
  const esAdmin = !!user?.es_admin;

  const [vistaFase, setVistaFase] = useState<UserFocusTabKey>("grupos");
  const [grupo, setGrupo] = useState<GrupoLetter>("A");
  const [showMejores, setShowMejores] = useState(false);
  const [partidosGrupos, setPartidosGrupos] = useState<Partido[]>([]);
  const [partidosKO, setPartidosKO] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [edicionResultados, setEdicionResultados] = useState<
    Record<string, { gl: string; gv: string; saving?: boolean }>
  >({});
  const [draftEquiposKO, setDraftEquiposKO] = useState<
    Record<string, { local: string; visitante: string }>
  >({});
  const [savingEquiposPartidoId, setSavingEquiposPartidoId] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const prevFocusRef = useRef<UserFocusTabKey | null>(null);

  const refreshAll = useCallback(
    async (runBracketSync: boolean) => {
      const { data } = await supabase
        .from("partidos")
        .select("*")
        .in("fase", [...TODAS_LAS_FASES_DB])
        .not("match_no", "is", null);
      let lista = (data as Partido[]) ?? [];
      if (runBracketSync) {
        const ups = computeBracketNombreUpdates(lista);
        for (const u of ups) {
          await supabase
            .from("partidos")
            .update({ equipo_local: u.equipo_local, equipo_visitante: u.equipo_visitante })
            .eq("id", u.id);
        }
        if (ups.length > 0) {
          const { data: d2 } = await supabase
            .from("partidos")
            .select("*")
            .in("fase", [...TODAS_LAS_FASES_DB])
            .not("match_no", "is", null);
          lista = (d2 as Partido[]) ?? [];
        }
      }
      const g = lista
        .filter((p) => p.fase === "grupos")
        .sort((a, b) => (a.match_no ?? 0) - (b.match_no ?? 0));
      const ko = lista
        .filter((p) => p.fase !== "grupos")
        .sort((a, b) => (a.match_no ?? 0) - (b.match_no ?? 0));
      setPartidosGrupos(g);
      setPartidosKO(ko);
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
    },
    [supabase]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshAll(esAdmin);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [esAdmin, refreshAll]);

  useEffect(() => {
    if (!esAdmin) {
      setDraftEquiposKO({});
      return;
    }
    setDraftEquiposKO(
      Object.fromEntries(
        partidosKO.map((p) => [p.id, { local: p.equipo_local, visitante: p.equipo_visitante }])
      )
    );
  }, [esAdmin, partidosKO]);

  const allPartidos = useMemo(
    () => [...partidosGrupos, ...partidosKO],
    [partidosGrupos, partidosKO]
  );

  const visibleTabs = useMemo(
    () => (esAdmin ? USER_PHASE_TAB_ORDER : getUserUnlockedTabs(allPartidos)),
    [esAdmin, allPartidos]
  );

  const focusTabUsuario = useMemo(
    () => (esAdmin ? null : getUserFocusTab(allPartidos)),
    [esAdmin, allPartidos]
  );

  useEffect(() => {
    if (esAdmin) return;
    const focus = getUserFocusTab(allPartidos);
    if (prevFocusRef.current !== focus) {
      prevFocusRef.current = focus;
      setVistaFase(focus);
    }
  }, [esAdmin, allPartidos]);

  useEffect(() => {
    if (visibleTabs.includes(vistaFase)) return;
    setVistaFase(esAdmin ? "grupos" : getUserFocusTab(allPartidos));
  }, [visibleTabs, vistaFase, esAdmin, allPartidos]);

  const partidosKOActivos = useMemo(() => {
    if (vistaFase === "grupos") return [];
    return partidosParaTabUsuario(allPartidos, vistaFase);
  }, [vistaFase, allPartidos]);

  const guardarResultado = async (id: string) => {
    const actual = edicionResultados[id] ?? { gl: "", gv: "" };
    const gl = actual.gl.trim();
    const gv = actual.gv.trim();
    const glNum = gl === "" ? null : Number(gl);
    const gvNum = gv === "" ? null : Number(gv);
    if (glNum === null || gvNum === null) return;

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
    await supabase.rpc("calcular_puntos_partido", { p_partido_id: id });
    await refreshAll(esAdmin);
    setEdicionResultados((prev) => ({
      ...prev,
      [id]: { ...prev[id], saving: false },
    }));
  };

  const quitarResultado = async (id: string) => {
    setEdicionResultados((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { gl: "", gv: "" }), saving: true },
    }));
    const { error } = await supabase
      .from("partidos")
      .update({
        goles_local_real: null,
        goles_visitante_real: null,
        cerrado: false,
        avanza_local_real: null,
        ganador_equipo: null,
      })
      .eq("id", id);
    if (!error) {
      await supabase.rpc("calcular_puntos_partido", { p_partido_id: id });
      await refreshAll(esAdmin);
    }
    setEdicionResultados((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { gl: "", gv: "" }), saving: false },
    }));
  };

  const guardarEquiposPartidoKO = async (partidoId: string) => {
    const d = draftEquiposKO[partidoId];
    if (!d) return;
    const local = d.local.trim();
    const visitante = d.visitante.trim();
    if (!local || !visitante) return;
    setSavingEquiposPartidoId(partidoId);
    const { error } = await supabase
      .from("partidos")
      .update({ equipo_local: local, equipo_visitante: visitante })
      .eq("id", partidoId);
    if (!error) {
      await refreshAll(false);
    }
    setSavingEquiposPartidoId(null);
  };

  if (loading) return <div className="p-4 font-serif">Cargando…</div>;

  const partidos = partidosGrupos;
  const partidosGrupo = partidos.filter((p) => p.grupo === grupo);
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

  const terceros = GRUPOS.map((g) => {
    const t = tablasPorGrupo[g];
    if (!t || t.length < 3) return null;
    return { grupo: g, ...t[2] };
  }).filter(Boolean) as Array<TablaRow & { grupo: GrupoLetter }>;

  const tercerosOrdenados = [...terceros].sort(
    (a, b) => b.Pts - a.Pts || b.DG - a.DG || b.GF - a.GF
  );
  const mejoresTercerosSet = new Set(
    tercerosOrdenados.slice(0, 8).map((t) => `${t.grupo}-${t.equipo}`)
  );

  const renderPartidoKO = (p: Partido) => {
    const tieneResultado = p.goles_local_real != null && p.goles_visitante_real != null;
    const edicion = edicionResultados[p.id] ?? { gl: "", gv: "", saving: false };
    return (
      <div key={p.id} className="bg-white rounded-2xl border border-[#E0EAFF] shadow-md p-4">
        <MatchCardHeader
          matchNoDisplay={p.match_no ? `M${p.match_no}` : ""}
          phaseLabel={etiquetaFaseEliminatoria(p.fase)}
          fecha={p.fecha}
          hora={p.hora}
        />
        {esAdmin && (
          <div className="rounded-lg border border-[#0D7A3E]/30 bg-[#0D7A3E]/5 px-2 py-2 mb-3 space-y-2">
            <p className="text-[10px] font-semibold text-[#0A0A0A]/80 font-serif">
              Editar participantes (eliminatoria)
            </p>
            <p className="text-[9px] text-[#0A0A0A]/55 font-serif leading-snug">
              Menús acotados al hueco del calendario (ej. 2° A / 2° B o 1° E / pool de 3°) y al equipo ya
              resuelto si hay marcadores.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-[#0A0A0A]/65 mb-0.5">Local</label>
                <select
                  className="w-full rounded-lg border border-[#CBD5FF] px-2 py-1.5 text-xs font-serif bg-white"
                  value={draftEquiposKO[p.id]?.local ?? p.equipo_local}
                  onChange={(e) =>
                    setDraftEquiposKO((prev) => ({
                      ...prev,
                      [p.id]: {
                        local: e.target.value,
                        visitante: prev[p.id]?.visitante ?? p.equipo_visitante,
                      },
                    }))
                  }
                >
                  {opcionesSelectHuecoEliminatoria(
                    p,
                    "local",
                    draftEquiposKO[p.id]?.local ?? p.equipo_local,
                    allPartidos
                  ).map((n) => (
                    <option key={`${p.id}-l-${n}`} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[#0A0A0A]/65 mb-0.5">Visitante</label>
                <select
                  className="w-full rounded-lg border border-[#CBD5FF] px-2 py-1.5 text-xs font-serif bg-white"
                  value={draftEquiposKO[p.id]?.visitante ?? p.equipo_visitante}
                  onChange={(e) =>
                    setDraftEquiposKO((prev) => ({
                      ...prev,
                      [p.id]: {
                        local: prev[p.id]?.local ?? p.equipo_local,
                        visitante: e.target.value,
                      },
                    }))
                  }
                >
                  {opcionesSelectHuecoEliminatoria(
                    p,
                    "visitante",
                    draftEquiposKO[p.id]?.visitante ?? p.equipo_visitante,
                    allPartidos
                  ).map((n) => (
                    <option key={`${p.id}-v-${n}`} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              disabled={savingEquiposPartidoId === p.id}
              onClick={() => guardarEquiposPartidoKO(p.id)}
              className="w-full sm:w-auto rounded-lg bg-[#1A3A6B] px-3 py-1.5 text-[11px] text-white font-semibold disabled:opacity-50"
            >
              {savingEquiposPartidoId === p.id ? "Guardando…" : "Guardar equipos"}
            </button>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="font-serif flex-1 text-center text-[#0A0A0A] text-sm">
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
          <span className="font-serif flex-1 text-center text-[#0A0A0A] text-sm">
            {BANDERAS_POR_EQUIPO[p.equipo_visitante] && (
              <span className="mr-2">{BANDERAS_POR_EQUIPO[p.equipo_visitante]}</span>
            )}
            {p.equipo_visitante}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#0A0A0A]/70 font-serif">
          <span aria-hidden>📍</span>
          <span>
            {(p.estadio || p.ciudad) ? [p.estadio, p.ciudad].filter(Boolean).join(" — ") : "–"}
          </span>
        </div>
        {esAdmin && (
          <div className="mt-3 pt-3 border-t border-[#E8E3DC]">
            <div className="flex flex-col gap-2 text-xs font-serif">
              <span className="text-[#0A0A0A]/70">Marcador 90&apos; (admin)</span>
              <div className="flex items-center justify-between gap-2 flex-wrap">
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
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => guardarResultado(p.id)}
                    disabled={edicion.saving}
                    className="rounded-md bg-[#1A3A6B] px-3 py-1 text-[11px] text-white font-medium disabled:opacity-60"
                  >
                    {edicion.saving ? "Guardando…" : "Guardar"}
                  </button>
                  {tieneResultado && (
                    <button
                      type="button"
                      onClick={() => quitarResultado(p.id)}
                      disabled={edicion.saving}
                      className="rounded-md border border-[#C8392B]/60 px-3 py-1 text-[11px] text-[#C8392B] font-medium disabled:opacity-40"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-[#0A0A0A]/55">
                Registra el marcador a los 90&apos; (sin tiempo extra ni penales). La quiniela compara
                con ese marcador y con quién clasifica.
              </p>
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
  };

  return (
    <div className="p-4 pb-8">
      <h1 className="font-serif text-lg font-extrabold text-[#00163A] mb-2">Resultados</h1>
      <p className="text-[11px] text-[#0A0A0A]/65 font-serif mb-3">
        Tablas y marcadores reales. Cambia de fase con las pestañas (igual que en Partidos).
      </p>

      {!esAdmin && focusTabUsuario && (
        <p className="text-[11px] font-serif text-[#0052FF] mb-2 font-semibold">
          Foco: {etiquetaUserTab(focusTabUsuario)}
          {vistaFase !== focusTabUsuario ? " · revisando otra fase" : ""}
        </p>
      )}
      {esAdmin && (
        <p className="text-[11px] font-serif text-[#0D7A3E]/90 mb-2 rounded-lg bg-[#0D7A3E]/10 px-2 py-1.5">
          Admin: todas las fases visibles. Al guardar o quitar un marcador se recalculan cruces (1°/2°/3°,
          W(M#), Gan./Perd.) cuando corresponda. En eliminatoria puedes corregir <strong>local / visitante</strong>{" "}
          con los menús bajo cada partido.
        </p>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {visibleTabs.map((key) => {
          const marcarFoco = !esAdmin && focusTabUsuario === key && vistaFase !== key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setVistaFase(key);
                if (key !== "grupos") setShowMejores(false);
              }}
              className={`flex-shrink-0 px-3 py-2 rounded-full font-serif text-[11px] sm:text-xs font-semibold transition-colors ${
                vistaFase === key ? "bg-[#0052FF] text-white" : "bg-[#E0EAFF] text-[#00163A]/80"
              } ${marcarFoco ? "ring-2 ring-amber-400/90 ring-offset-1" : ""}`}
            >
              {etiquetaUserTab(key)}
            </button>
          );
        })}
      </div>

      {vistaFase === "grupos" && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {GRUPOS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGrupo(g);
                setShowMejores(false);
              }}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-serif text-sm font-semibold transition-colors ${
                !showMejores && grupo === g ? "bg-[#0052FF] text-white" : "bg-[#E0EAFF] text-[#00163A]/80"
              }`}
            >
              Grupo {g}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowMejores(true)}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-serif text-sm font-semibold transition-colors ${
              showMejores ? "bg-[#0052FF] text-white" : "bg-[#E0EAFF] text-[#00163A]/80"
            }`}
          >
            Mejores terceros
          </button>
        </div>
      )}

      {vistaFase === "grupos" && !showMejores && (
        <>
          <section className="bg-white rounded-2xl border border-[#E0EAFF] shadow-sm p-4 mb-6 overflow-x-auto">
            <h2 className="font-serif font-extrabold text-[#00163A] mb-3 text-sm tracking-wide uppercase">
              Tabla real — Grupo {grupo}
            </h2>
            <table className="w-full text-left font-mono text-sm">
              <thead>
                <tr className="border-b border-[#E0EAFF]">
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
                    ? "bg-[#1A3A6B]/10"
                    : esMejorTercero
                      ? "bg-[#D4A843]/20"
                      : "";
                  return (
                    <tr
                      key={row.equipo}
                      className={`border-b border-[#E0EAFF]/60 ${rowHighlight}`}
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

          <section className="space-y-4">
            <h2 className="font-serif font-extrabold text-[#00163A] text-sm tracking-wide uppercase">
              Partidos — Grupo {grupo}
            </h2>
            {partidosGrupo.map((p) => {
              const tieneResultado = p.goles_local_real != null && p.goles_visitante_real != null;
              const edicion = edicionResultados[p.id] ?? { gl: "", gv: "", saving: false };
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-[#E0EAFF] shadow-md p-4"
                >
                  <MatchCardHeader
                    matchNoDisplay={p.match_no ? `M${p.match_no}` : ""}
                    phaseLabel={`Grupo ${p.grupo}`}
                    fecha={p.fecha}
                    hora={p.hora}
                  />
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
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => guardarResultado(p.id)}
                              disabled={edicion.saving}
                              className="rounded-md bg-[#1A3A6B] px-3 py-1 text-[11px] text-white font-medium disabled:opacity-60"
                            >
                              {edicion.saving ? "Guardando…" : "Guardar"}
                            </button>
                            {tieneResultado && (
                              <button
                                type="button"
                                onClick={() => quitarResultado(p.id)}
                                disabled={edicion.saving}
                                className="rounded-md border border-[#C8392B]/60 px-3 py-1 text-[11px] text-[#C8392B] font-medium disabled:opacity-40"
                              >
                                Quitar
                              </button>
                            )}
                          </div>
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

      {vistaFase === "grupos" && showMejores && (
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
              {tercerosOrdenados.map((row, i) => (
                <tr
                  key={`${row.grupo}-${row.equipo}`}
                  className={`border-b border-[#E8E3DC]/60 ${i < 8 ? "bg-[#1A3A6B]/10" : ""}`}
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
              ))}
            </tbody>
          </table>
          {tercerosOrdenados.length === 0 && (
            <p className="mt-3 text-xs text-[#0A0A0A]/60 font-serif">
              La tabla de mejores terceros se calculará cuando haya resultados en todos los grupos.
            </p>
          )}
        </section>
      )}

      {vistaFase !== "grupos" && (
        <section className="space-y-4">
          <h2 className="font-serif font-extrabold text-[#00163A] text-sm tracking-wide uppercase">
            {etiquetaUserTab(vistaFase)} — marcador real
          </h2>
          {partidosKOActivos.length === 0 ? (
            <p className="text-[#0A0A0A]/60 font-serif text-center py-4">No hay partidos en esta fase.</p>
          ) : (
            partidosKOActivos.map((p) => renderPartidoKO(p))
          )}
        </section>
      )}
    </div>
  );
}
