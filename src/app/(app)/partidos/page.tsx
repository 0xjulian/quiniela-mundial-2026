"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { BANDERAS_POR_EQUIPO, FASES_ELIMINATORIA_ORDEN, etiquetaFaseEliminatoria } from "@/lib/constants";
import type { Partido } from "@/types/db";
import {
  getUserUnlockedTabs,
  getUserFocusTab,
  partidosParaTabUsuario,
  etiquetaUserTab,
  USER_PHASE_TAB_ORDER,
  type UserFocusTabKey,
} from "@/lib/tournament-phase";
import { MatchCardHeader } from "@/components/MatchCardHeader";
import { opcionesSelectHuecoEliminatoria } from "@/lib/knockout-slot-options";

/** Cierra predicciones 1 minuto antes del partido (hora en CT = Mexico City, UTC-6) */
function prediccionCerradaPorTiempo(p: Partido): boolean {
  if (!p.fecha) return false;
  const horaNorm = (p.hora || "00:00").slice(0, 5);
  const [hh = 0, mm = 0] = horaNorm.split(":").map(Number);
  const [y, mo, d] = p.fecha.split("-").map(Number);
  const matchUtc = Date.UTC(y, mo - 1, d, hh + 6, mm, 0, 0);
  const deadline = matchUtc - 60 * 1000;
  return Date.now() >= deadline;
}

function esEliminatoria(p: Partido): boolean {
  return p.fase !== "grupos";
}

type PredDraft = {
  goles_local: number;
  goles_visitante: number;
  avanza_local_pred: boolean | null;
};

export default function PartidosPage() {
  const { user } = useUser();
  const esAdmin = !!user?.es_admin;
  const [partidosGrupos, setPartidosGrupos] = useState<Partido[]>([]);
  const [partidosKO, setPartidosKO] = useState<Partido[]>([]);
  const [faseTab, setFaseTab] = useState<UserFocusTabKey>("grupos");
  const [predicciones, setPredicciones] = useState<Record<string, PredDraft>>({});
  const [savingPartidoId, setSavingPartidoId] = useState<string | null>(null);
  const [draftEquiposKO, setDraftEquiposKO] = useState<
    Record<string, { local: string; visitante: string }>
  >({});
  const [savingEquiposPartidoId, setSavingEquiposPartidoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const aprobado = user?.aprobado && user?.pagado;
  const prevFocusRef = useRef<UserFocusTabKey | null>(null);

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
      setFaseTab(focus);
    }
  }, [esAdmin, allPartidos]);

  useEffect(() => {
    if (visibleTabs.includes(faseTab)) return;
    setFaseTab(esAdmin ? "grupos" : getUserFocusTab(allPartidos));
  }, [visibleTabs, faseTab, esAdmin, allPartidos]);

  const partidosActivos = useMemo(
    () => partidosParaTabUsuario(allPartidos, faseTab),
    [allPartidos, faseTab]
  );

  /** Grupos + KO: necesario para opciones de hueco (W(M#), 1°/2°/3°). */
  const todosPartidosParaHuecos = useMemo(
    () => [...partidosGrupos, ...partidosKO],
    [partidosGrupos, partidosKO]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [gRes, koRes] = await Promise.all([
        supabase
          .from("partidos")
          .select("*")
          .eq("fase", "grupos")
          .not("match_no", "is", null)
          .order("match_no", { ascending: true }),
        supabase
          .from("partidos")
          .select("*")
          .in("fase", [...FASES_ELIMINATORIA_ORDEN])
          .not("match_no", "is", null)
          .order("match_no", { ascending: true }),
      ]);
      if (cancelled) return;
      setPartidosGrupos((gRes.data as Partido[]) ?? []);
      setPartidosKO((koRes.data as Partido[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (!user?.id) return;
    const ids = [...partidosGrupos, ...partidosKO].map((p) => p.id);
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("predicciones")
        .select("partido_id, goles_local, goles_visitante, avanza_local_pred")
        .eq("user_id", user.id)
        .in("partido_id", ids);
      if (cancelled) return;
      const map: Record<string, PredDraft> = {};
      for (const r of data ?? []) {
        map[r.partido_id] = {
          goles_local: r.goles_local,
          goles_visitante: r.goles_visitante,
          avanza_local_pred:
            r.avanza_local_pred === null || r.avanza_local_pred === undefined
              ? null
              : Boolean(r.avanza_local_pred),
        };
      }
      setPredicciones((prev) => {
        const next = { ...prev };
        for (const p of [...partidosGrupos, ...partidosKO]) {
          if (!next[p.id]) {
            next[p.id] = { goles_local: 0, goles_visitante: 0, avanza_local_pred: null };
          }
        }
        for (const k of Object.keys(map)) {
          next[k] = {
            ...(next[k] ?? { goles_local: 0, goles_visitante: 0, avanza_local_pred: null }),
            ...map[k],
          };
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, partidosGrupos, partidosKO, supabase]);

  const guardarPartido = async (partidoId: string, p: Partido) => {
    if (!user?.id) return;
    const pred = predicciones[partidoId];
    if (pred == null) return;
    const ko = esEliminatoria(p);
    const empatePred = pred.goles_local === pred.goles_visitante;
    if (ko && empatePred && pred.avanza_local_pred === null) {
      return;
    }
    setSavingPartidoId(partidoId);
    try {
      const avanza =
        ko && empatePred ? pred.avanza_local_pred : null;
      const { error } = await supabase.from("predicciones").upsert(
        {
          user_id: user.id,
          partido_id: partidoId,
          goles_local: pred.goles_local,
          goles_visitante: pred.goles_visitante,
          avanza_local_pred: avanza,
        },
        { onConflict: "user_id,partido_id" }
      );
      if (error) {
        // silent
      }
    } finally {
      setSavingPartidoId(null);
    }
  };

  const guardarEquiposPartidoKO = async (partidoId: string) => {
    const d = draftEquiposKO[partidoId];
    if (!d) return;
    const local = d.local.trim();
    const visitante = d.visitante.trim();
    if (!local || !visitante) return;
    setSavingEquiposPartidoId(partidoId);
    try {
      const { error } = await supabase
        .from("partidos")
        .update({ equipo_local: local, equipo_visitante: visitante })
        .eq("id", partidoId);
      if (!error) {
        setPartidosKO((prev) =>
          prev.map((p) =>
            p.id === partidoId ? { ...p, equipo_local: local, equipo_visitante: visitante } : p
          )
        );
      }
    } finally {
      setSavingEquiposPartidoId(null);
    }
  };

  return (
    <div className="p-4 pb-8 font-sans">
      <h1 className="font-serif text-xl font-extrabold text-[#00163A] tracking-wide mb-1">
        Partidos
      </h1>
      <p className="text-xs font-serif text-[#0A0A0A]/70 mb-2">
        <strong>Usuarios:</strong> solo se desbloquea la siguiente fase cuando todos los marcadores reales
        de la anterior están en <strong>Resultados</strong>. La pestaña activa es la del momento; las
        demás sirven para <em>look back</em>. En eliminatoria el marcador vale solo por los{" "}
        <strong>90 minutos</strong> (no cuentan goles en tiempo extra ni en penales); para puntos importa
        acertar <strong>quién pasa</strong> de ronda.
      </p>
      {esAdmin && (
        <p className="text-[11px] font-serif text-[#0D7A3E]/90 mb-2 rounded-lg bg-[#0D7A3E]/10 px-2 py-1.5">
          Admin: ves todas las fases siempre; al guardar resultados en Resultados los cruces se actualizan
          solos cuando corresponda. En <strong>eliminatoria</strong> puedes corregir <strong>local /
          visitante</strong> con los menús y &quot;Guardar equipos&quot; (también en{" "}
          <strong>Resultados</strong> y en <strong>Admin → Editar cruces</strong>).
        </p>
      )}
      {!esAdmin && focusTabUsuario && (
        <p className="text-[11px] font-serif text-[#0052FF] mb-2 font-semibold">
          Foco ahora: {etiquetaUserTab(focusTabUsuario)}
          {faseTab !== focusTabUsuario ? " · estás revisando otra fase" : ""}
        </p>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {visibleTabs.map((key) => {
          const marcarFocoActual = !esAdmin && focusTabUsuario === key && faseTab !== key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFaseTab(key)}
              className={`flex-shrink-0 px-3 py-2 rounded-full font-serif text-[11px] sm:text-xs font-semibold transition-colors ${
                faseTab === key ? "bg-[#0052FF] text-white" : "bg-[#E0EAFF] text-[#00163A]/80"
              } ${marcarFocoActual ? "ring-2 ring-amber-400/90 ring-offset-1" : ""}`}
            >
              {etiquetaUserTab(key)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-[#0A0A0A]/60 font-serif py-8 text-center">Cargando partidos…</p>
      ) : partidosActivos.length === 0 ? (
        <p className="text-sm text-[#0A0A0A]/60 font-serif py-8 text-center">
          No hay partidos en esta fase.
        </p>
      ) : (
        <section className="space-y-4">
          {partidosActivos.map((p, idx) => {
            const cerradoPorTiempo = prediccionCerradaPorTiempo(p);
            const cerrado = p.cerrado || cerradoPorTiempo;
            const pred = predicciones[p.id] ?? {
              goles_local: 0,
              goles_visitante: 0,
              avanza_local_pred: null,
            };
            const guardando = savingPartidoId === p.id;
            const ko = esEliminatoria(p);
            const empatePred = pred.goles_local === pred.goles_visitante;
            const faltaAvanza = ko && empatePred && pred.avanza_local_pred === null && aprobado && !cerrado;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-[#E0EAFF] shadow-md p-4 flex flex-col gap-3"
              >
                <MatchCardHeader
                  matchNoDisplay={p.match_no ? `M${p.match_no}` : `M${idx + 1}`}
                  phaseLabel={
                    ko ? etiquetaFaseEliminatoria(p.fase) : `Grupo ${p.grupo}`
                  }
                  fecha={p.fecha}
                  hora={p.hora}
                  extraRight={
                    cerradoPorTiempo && !p.cerrado ? (
                      <span className="text-[#C8392B] font-medium text-[10px] sm:text-xs">
                        Predicciones cerradas
                      </span>
                    ) : undefined
                  }
                />
                {esAdmin && ko && (
                  <div className="rounded-lg border border-[#0D7A3E]/30 bg-[#0D7A3E]/5 px-2 py-2 mb-2 space-y-2">
                    <p className="text-[10px] font-semibold text-[#0A0A0A]/80 font-serif">
                      Editar participantes (eliminatoria)
                    </p>
                    <p className="text-[9px] text-[#0A0A0A]/55 font-serif leading-snug">
                      Cada menú solo muestra el hueco de este partido y, si ya hay marcadores, el equipo
                      que corresponde (no toda la lista del Mundial).
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
                            todosPartidosParaHuecos
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
                            todosPartidosParaHuecos
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
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-serif flex-1 text-center text-[#0A0A0A] text-sm">
                    {BANDERAS_POR_EQUIPO[p.equipo_local] && (
                      <span className="mr-2">{BANDERAS_POR_EQUIPO[p.equipo_local]}</span>
                    )}
                    {p.equipo_local}
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={pred.goles_local}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val = raw === "" ? 0 : Number(raw);
                        setPredicciones((prev) => ({
                          ...prev,
                          [p.id]: {
                            ...(prev[p.id] ?? {
                              goles_local: 0,
                              goles_visitante: 0,
                              avanza_local_pred: null,
                            }),
                            goles_local: val,
                          },
                        }));
                      }}
                      disabled={!aprobado || cerrado}
                      className="w-12 h-9 text-center border border-[#CBD5FF] rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[#0052FF]/70"
                    />
                    <span className="font-mono text-[#0A0A0A]/60 text-base sm:text-lg">vs</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={pred.goles_visitante}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const val = raw === "" ? 0 : Number(raw);
                        setPredicciones((prev) => ({
                          ...prev,
                          [p.id]: {
                            ...(prev[p.id] ?? {
                              goles_local: 0,
                              goles_visitante: 0,
                              avanza_local_pred: null,
                            }),
                            goles_visitante: val,
                          },
                        }));
                      }}
                      disabled={!aprobado || cerrado}
                      className="w-12 h-9 text-center border border-[#CBD5FF] rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[#0052FF]/70"
                    />
                  </div>
                  <span className="font-serif flex-1 text-center text-[#0A0A0A] text-sm">
                    {BANDERAS_POR_EQUIPO[p.equipo_visitante] && (
                      <span className="mr-2">{BANDERAS_POR_EQUIPO[p.equipo_visitante]}</span>
                    )}
                    {p.equipo_visitante}
                  </span>
                </div>
                {ko && empatePred && aprobado && !cerrado && (
                  <div className="rounded-lg bg-[#FFF9E6] border border-[#D4A843]/40 px-3 py-2 text-[11px] font-serif text-[#0A0A0A]/90">
                    <p className="font-semibold mb-1">Empate en 90&apos; — ¿quién clasifica?</p>
                    <p className="text-[10px] text-[#0A0A0A]/70 mb-2">
                      El marcador solo refleja los 90&apos;; aquí eliges quién avanza para los puntos.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPredicciones((prev) => ({
                            ...prev,
                            [p.id]: {
                              ...(prev[p.id] ?? {
                                goles_local: 0,
                                goles_visitante: 0,
                                avanza_local_pred: null,
                              }),
                              avanza_local_pred: true,
                            },
                          }))
                        }
                        className={`flex-1 min-w-[120px] rounded-lg px-2 py-2 text-xs font-semibold border ${
                          pred.avanza_local_pred === true
                            ? "bg-[#0052FF] text-white border-[#0052FF]"
                            : "bg-white border-[#E0EAFF]"
                        }`}
                      >
                        Avanza: {p.equipo_local}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPredicciones((prev) => ({
                            ...prev,
                            [p.id]: {
                              ...(prev[p.id] ?? {
                                goles_local: 0,
                                goles_visitante: 0,
                                avanza_local_pred: null,
                              }),
                              avanza_local_pred: false,
                            },
                          }))
                        }
                        className={`flex-1 min-w-[120px] rounded-lg px-2 py-2 text-xs font-semibold border ${
                          pred.avanza_local_pred === false
                            ? "bg-[#0052FF] text-white border-[#0052FF]"
                            : "bg-white border-[#E0EAFF]"
                        }`}
                      >
                        Avanza: {p.equipo_visitante}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#0A0A0A]/60 font-serif">
                  <span className="inline-flex items-center gap-1">
                    <Image
                      src="/estadio.png"
                      alt=""
                      width={14}
                      height={14}
                      className="opacity-80"
                    />
                    <span>{[p.estadio, p.ciudad].filter(Boolean).join(" — ")}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {p.goles_local_real != null && (
                      <span className="font-mono">
                        Real: {p.goles_local_real}–{p.goles_visitante_real}
                      </span>
                    )}
                    {aprobado && !cerrado && (
                      <button
                        type="button"
                        onClick={() => guardarPartido(p.id, p)}
                        disabled={guardando || faltaAvanza}
                        title={faltaAvanza ? "Elige quién avanza si predices empate" : undefined}
                        className="rounded-md bg-[#0052FF] px-3 py-1.5 text-[11px] text-white font-semibold disabled:opacity-60"
                      >
                        {guardando ? "Guardando…" : "Confirmar"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
