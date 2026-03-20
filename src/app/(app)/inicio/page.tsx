"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import {
  GRUPOS,
  EQUIPOS_POR_GRUPO,
  TODOS_LOS_EQUIPOS,
  BANDERAS_POR_EQUIPO,
  FECHA_PRIMER_PARTIDO_CT,
  MINUTOS_CIERRE_ANTES,
} from "@/lib/constants";
import type { GrupoLetter } from "@/lib/constants";
import { calcularTabla } from "@/lib/tabla";
import type { Partido, User as UserRow, Grupo } from "@/types/db";
import { getUserFocusTab, etiquetaUserTab } from "@/lib/tournament-phase";
import { MatchCardHeader } from "@/components/MatchCardHeader";

export default function InicioPage() {
  const { user } = useUser();
  const isPlaceholder = (name: string) => name.trim().toUpperCase() === "TBD";
  const [grupo, setGrupo] = useState<GrupoLetter>("A");
  const [predicciones, setPredicciones] = useState<Record<string, { goles_local: number; goles_visitante: number }>>({});
  const [campeon, setCampeon] = useState(user?.campeon_predicho ?? "");
  const [goleador, setGoleador] = useState(user?.goleador_predicho ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [adminUsers, setAdminUsers] = useState<UserRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [savingPartidoId, setSavingPartidoId] = useState<string | null>(null);
  const [grupoConfig, setGrupoConfig] = useState<Pick<Grupo, "codigo" | "campeon_real" | "goleador_real"> | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [partidosCronologico, setPartidosCronologico] = useState<Partido[]>([]);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  // Defensive: avoid showing placeholder teams like "TBD" if any old data/constants leak in
  const equipos = [...new Set(EQUIPOS_POR_GRUPO[grupo].filter((e) => e && !isPlaceholder(e)))];
  // Partidos del grupo actual (misma fuente que cronológico para mantener todo ligado)
  const partidos = partidosCronologico.filter((p) => p.grupo === grupo);

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

  // Cierre de campeón y goleador: MINUTOS_CIERRE_ANTES antes del primer partido
  function estaCerradoCampeonYGoleador(): boolean {
    const base = new Date(`${FECHA_PRIMER_PARTIDO_CT}:00Z`);
    const cierreMs = base.getTime() - MINUTOS_CIERRE_ANTES * 60 * 1000;
    return Date.now() >= cierreMs;
  }
  const cerradoCampeonYGoleador = estaCerradoCampeonYGoleador();

  const [etiquetaFaseTorneo, setEtiquetaFaseTorneo] = useState<string | null>(null);

  useEffect(() => {
    if (user?.es_admin) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("partidos")
        .select("fase,match_no,goles_local_real,goles_visitante_real")
        .not("match_no", "is", null);
      if (cancelled) return;
      const list = (data as Partido[]) ?? [];
      setEtiquetaFaseTorneo(etiquetaUserTab(getUserFocusTab(list)));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.es_admin, supabase]);

  // Cargar todos los partidos de fase grupos en orden cronológico (match_no) — una sola fuente
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("partidos")
        .select("*")
        .eq("fase", "grupos")
        .not("match_no", "is", null)
        .order("match_no", { ascending: true });
      if (!cancelled) setPartidosCronologico((data as Partido[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, []);

  // Cargar predicciones del usuario para todos los partidos (misma fuente para grupo y calendario)
  useEffect(() => {
    if (!user?.id || partidosCronologico.length === 0) return;
    let cancelled = false;
    const partidoIds = partidosCronologico.map((p) => p.id);
    (async () => {
      const { data } = await supabase
        .from("predicciones")
        .select("partido_id, goles_local, goles_visitante")
        .eq("user_id", user.id)
        .in("partido_id", partidoIds);
      if (cancelled) return;
      const map: Record<string, { goles_local: number; goles_visitante: number }> = {};
      for (const r of data ?? []) {
        map[r.partido_id] = { goles_local: r.goles_local, goles_visitante: r.goles_visitante };
      }
      setPredicciones(map);
    })();
    return () => { cancelled = true; };
  }, [user?.id, partidosCronologico]);

  useEffect(() => {
    if (user?.campeon_predicho) setCampeon(user.campeon_predicho);
    if (user?.goleador_predicho) setGoleador(user.goleador_predicho);
  }, [user?.campeon_predicho, user?.goleador_predicho]);

  // Panel admin: carga de usuarios del grupo
  useEffect(() => {
    if (!user?.es_admin) return;
    let cancelled = false;
    (async () => {
      setAdminLoading(true);
      setAdminError(null);

      // Cargar configuración de campeón/goleador reales del grupo
      const { data: grupoData, error: grupoError } = await supabase
        .from("grupos")
        .select("codigo, campeon_real, goleador_real")
        .eq("codigo", user.grupo_code)
        .maybeSingle();

      if (!grupoError && grupoData) {
        setGrupoConfig(
          grupoData as Pick<Grupo, "codigo" | "campeon_real" | "goleador_real">
        );
      }

      // Cargar participantes del grupo (vía RPC admin)
      const { data, error } = await supabase.rpc("admin_get_group_users");
      if (cancelled) return;
      if (error) {
        setAdminError(
          error.message || "No se pudieron cargar los participantes."
        );
      } else {
        setAdminUsers((data as UserRow[]) ?? []);
      }
      setAdminLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.es_admin, user?.grupo_code, supabase]);

  const toggleUserField = async (id: string, field: "aprobado" | "pagado") => {
    const target = adminUsers.find((u) => u.id === id);
    if (!target) return;
    const nuevoValor = !target[field];
    const previo = [...adminUsers];
    setAdminUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: nuevoValor } : u))
    );
    const payload = {
      p_user_id: id,
      p_aprobado: field === "aprobado" ? nuevoValor : target.aprobado,
      p_pagado: field === "pagado" ? nuevoValor : target.pagado,
    };
    const { error } = await supabase.rpc("admin_update_user_flags", payload);
    if (error) {
      setAdminError(error.message || "No se pudo actualizar el usuario.");
      setAdminUsers(previo);
    }
  };

  const partidosConPred = partidos.map((p) => ({
    equipo_local: p.equipo_local,
    equipo_visitante: p.equipo_visitante,
    goles_local: predicciones[p.id]?.goles_local ?? 0,
    goles_visitante: predicciones[p.id]?.goles_visitante ?? 0,
  }));
  const tabla = calcularTabla(partidosConPred, equipos);

  const guardarPartido = async (partidoId: string) => {
    if (!user?.id) return;
    const pred = predicciones[partidoId];
    if (pred == null) return;
    setSavingPartidoId(partidoId);
    try {
      const { error } = await supabase.from("predicciones").upsert(
        {
          user_id: user.id,
          partido_id: partidoId,
          goles_local: pred.goles_local,
          goles_visitante: pred.goles_visitante,
        },
        { onConflict: "user_id,partido_id" }
      );
      if (error) setMessage("Error al guardar. Intenta de nuevo.");
    } finally {
      setSavingPartidoId(null);
    }
  };

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
      await supabase
        .from("users")
        .update({
          campeon_predicho: campeon || null,
          goleador_predicho: goleador || null,
        })
        .eq("id", user.id);
      setMessage("Predicciones guardadas.");
    } catch {
      setMessage("Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const aprobado = user?.aprobado && user?.pagado;

  const guardarConfigGrupo = async () => {
    if (!user?.es_admin || !grupoConfig) return;
    setSavingConfig(true);
    setAdminError(null);
    const { error } = await supabase
      .from("grupos")
      .update({
        campeon_real: grupoConfig.campeon_real ?? null,
        goleador_real: grupoConfig.goleador_real ?? null,
      })
      .eq("codigo", user.grupo_code);
    if (error) {
      setAdminError(
        error.message || "No se pudo guardar el campeón / goleador reales."
      );
    }
    setSavingConfig(false);
  };

  // Vista especial: si es admin, Inicio funciona solo como panel de gestión rápido,
  // sin participar en la quiniela.
  if (user?.es_admin) {
    return (
      <div className="p-4 pb-8 font-sans space-y-4">
        <section className="mb-2 rounded-2xl border border-[#E0EAFF] bg-white p-4 shadow-md">
          <h2 className="mb-1 font-serif text-sm font-semibold text-[#0A0A0A]">
            Panel admin — Inicio
          </h2>
          <p className="text-xs font-serif text-[#0A0A0A]/75">
            Como administrador no participas en la quiniela desde esta pantalla.
            Usa esta vista para gestionar participantes. Para cargar resultados reales
            de fase de grupos, ve a <span className="font-semibold">Resultados</span> (marcador).
            Para <strong>publicar eliminatoria</strong> (16avos → final) y editar cruces si hace falta, abre{" "}
            <Link href="/admin" className="font-semibold text-[#0052FF] underline">
              Panel admin completo
            </Link>
            .
          </p>
        </section>

        <section className="rounded-2xl border border-[#E0EAFF] bg-white p-4 shadow-md">
          <h2 className="mb-2 font-serif text-sm font-semibold text-[#0A0A0A]">
            Campeón y goleador reales ({user.grupo_code})
          </h2>
          <p className="text-[11px] font-serif text-[#0A0A0A]/70 mb-3">
            Estos son los resultados oficiales del torneo. Se usarán para asignar
            puntos adicionales por campeón y goleador correctos.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#0A0A0A]/80 mb-1">
                Campeón del Mundial (real)
              </label>
              <select
                className="w-full rounded-md border border-[#E0EAFF] px-3 py-2 text-sm font-serif bg-white"
                value={grupoConfig?.campeon_real ?? ""}
                onChange={(e) =>
                  setGrupoConfig((prev) =>
                    prev
                      ? { ...prev, campeon_real: e.target.value }
                      : {
                          codigo: user.grupo_code,
                          campeon_real: e.target.value,
                          goleador_real: "",
                        }
                  )
                }
              >
                <option value="">Elegir campeón</option>
                {[...new Set(TODOS_LOS_EQUIPOS.map((e) => e.nombre))].map(
                  (nombre) => (
                    <option key={nombre} value={nombre}>
                      {BANDERAS_POR_EQUIPO[nombre]
                        ? `${BANDERAS_POR_EQUIPO[nombre]} ${nombre}`
                        : nombre}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#0A0A0A]/80 mb-1">
                Goleador del torneo (real)
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-[#E0EAFF] px-3 py-2 text-sm font-serif"
                placeholder="Ej. Mbappé"
                value={grupoConfig?.goleador_real ?? ""}
                onChange={(e) =>
                  setGrupoConfig((prev) =>
                    prev
                      ? { ...prev, goleador_real: e.target.value }
                      : {
                          codigo: user.grupo_code,
                          campeon_real: "",
                          goleador_real: e.target.value,
                        }
                  )
                }
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={guardarConfigGrupo}
                disabled={savingConfig}
                className="rounded-md bg-[#0052FF] px-4 py-2 text-xs text-white font-semibold disabled:opacity-60"
              >
                {savingConfig ? "Guardando..." : "Guardar campeón y goleador"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E0EAFF] bg-white p-4 shadow-md">
          <h2 className="mb-2 font-serif text-sm font-semibold text-[#0A0A0A]">
            Administración de participantes ({user.grupo_code})
          </h2>
          {adminError && (
            <p className="mb-2 text-xs font-serif text-[#C8392B]">{adminError}</p>
          )}
          {adminLoading ? (
            <p className="text-xs font-serif text-[#0A0A0A]/70">
              Cargando participantes…
            </p>
          ) : adminUsers.filter((u) => u.id !== user.id).length === 0 ? (
            <p className="text-xs font-serif text-[#0A0A0A]/70">
              No hay participantes en este grupo.
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs font-serif">
                <thead>
                  <tr className="border-b border-[#E0EAFF] text-[11px] text-[#00163A]/70">
                    <th className="py-1 pr-2">Usuario</th>
                    <th className="py-1 px-2">Teléfono</th>
                    <th className="py-1 px-2 text-center">Aprobado</th>
                    <th className="py-1 px-2 text-center">Pagado</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers
                    .filter((u) => u.id !== user.id)
                    .map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-[#E0EAFF]/60 text-[11px]"
                      >
                        <td className="py-1 pr-2">
                          <span className="font-medium">{u.username}</span>
                        </td>
                        <td className="py-1 px-2 text-[#0A0A0A]/80">
                          {u.telefono || "–"}
                        </td>
                        <td className="py-1 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={u.aprobado}
                            onChange={() => toggleUserField(u.id, "aprobado")}
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={u.pagado}
                            onChange={() => toggleUserField(u.id, "pagado")}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 font-sans">
      {etiquetaFaseTorneo && (
        <div className="mb-3 rounded-xl border border-[#0052FF]/30 bg-[#E8F0FF] px-3 py-2 text-[11px] font-serif text-[#00163A]">
          <span className="font-semibold">Momento del torneo:</span> {etiquetaFaseTorneo}. Las predicciones
          por fase siguen el avance de los <strong>resultados reales</strong>. Eliminatoria en{" "}
          <Link href="/partidos" className="font-semibold text-[#0052FF] underline">
            Partidos
          </Link>
          ; marcadores oficiales en{" "}
          <Link href="/marcador-final" className="font-semibold text-[#0052FF] underline">
            Resultados
          </Link>
          .
        </div>
      )}

      {/* Campeón del mundo y goleador */}
      <section className="bg-white rounded-2xl border border-[#E0EAFF] p-4 mb-3 shadow-sm">
        <h2 className="font-serif font-extrabold text-[#00163A] mb-2 text-sm tracking-wide uppercase">
          Tu campeón del Mundial (+5 pts)
        </h2>
        {cerradoCampeonYGoleador ? (
          <p className="text-sm text-[#0A0A0A]/80">
            Tu elección:{" "}
            <span className="font-semibold">
              {campeon || "sin seleccionar"}
            </span>
          </p>
        ) : (
          <select
            value={campeon}
            onChange={(e) => setCampeon(e.target.value)}
            disabled={!aprobado}
            className="w-full px-3 py-2 border border-[#CBD5FF] rounded-lg bg-white font-serif text-[#00163A]"
          >
            <option value="">Elegir campeón</option>
            {[...new Set(TODOS_LOS_EQUIPOS.map((e) => e.nombre))].map((nombre) => (
              <option key={nombre} value={nombre}>
                {BANDERAS_POR_EQUIPO[nombre] ? `${BANDERAS_POR_EQUIPO[nombre]} ${nombre}` : nombre}
              </option>
            ))}
          </select>
        )}
        {cerradoCampeonYGoleador && (
          <p className="mt-1 text-[11px] text-[#0A0A0A]/60">
            Cambiar campeón ya no es posible (cerrado antes del primer partido).
          </p>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-[#E0EAFF] p-4 mb-6 shadow-sm">
        <h2 className="font-serif font-extrabold text-[#00163A] mb-2 text-sm tracking-wide uppercase">
          Goleador del torneo (+3 pts)
        </h2>
        {cerradoCampeonYGoleador ? (
          <p className="text-sm text-[#0A0A0A]/80">
            Tu elección:{" "}
            <span className="font-semibold">
              {goleador || "sin seleccionar"}
            </span>
          </p>
        ) : (
          <input
            type="text"
            value={goleador}
            onChange={(e) => setGoleador(e.target.value)}
            disabled={!aprobado}
            placeholder="Nombre del goleador"
            className="w-full px-3 py-2 border border-[#CBD5FF] rounded-lg bg-white font-serif text-[#00163A] placeholder:text-[#64748B]"
          />
        )}
        {cerradoCampeonYGoleador && (
          <p className="mt-1 text-[11px] text-[#0A0A0A]/60">
            Este campo también se cerró antes del primer partido.
          </p>
        )}
        {aprobado && !cerradoCampeonYGoleador && (
          <button
            type="button"
            onClick={guardar}
            disabled={saving}
            className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-full bg-[#0052FF] text-white text-xs font-semibold tracking-wide disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar campeón y goleador"}
          </button>
        )}
      </section>

      {/* Selector de grupo — pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {GRUPOS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrupo(g)}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-serif text-sm font-semibold transition-colors ${
              grupo === g
                ? "bg-[#0052FF] text-white"
                : "bg-[#E0EAFF] text-[#00163A]/80"
            }`}
          >
            Grupo {g}
          </button>
        ))}
      </div>

      {/* Tabla de posiciones predicha */}
      <section className="bg-white rounded-2xl border border-[#E0EAFF] shadow-sm p-4 mb-6 overflow-x-auto">
        <h2 className="font-serif font-extrabold text-[#00163A] mb-3 text-sm tracking-wide uppercase">
          Grupo {grupo}
        </h2>
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
            {tabla
              .filter((row) => row.equipo && !isPlaceholder(row.equipo))
              .map((row, i) => (
              <tr
                key={row.equipo}
                className={`border-b border-[#E0EAFF]/60 ${
                  i < 2 ? "bg-[#E0EAFF]/40" : ""
                }`}
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
        <h2 className="font-serif font-extrabold text-[#00163A] text-sm tracking-wide uppercase">
          Haz tus Predicciones — Grupo {grupo}
        </h2>
        {partidos.map((p, idx) => {
          const cerradoPorTiempo = prediccionCerradaPorTiempo(p);
          const cerrado = p.cerrado || cerradoPorTiempo;
          const pred = predicciones[p.id] ?? { goles_local: 0, goles_visitante: 0 };
          const guardando = savingPartidoId === p.id;
          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-[#E0EAFF] shadow-md p-4 flex flex-col gap-3"
            >
              <MatchCardHeader
                matchNoDisplay={p.match_no ? `M${p.match_no}` : `M${idx + 1}`}
                phaseLabel={`Grupo ${grupo}`}
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

              {/* Middle row: teams + prediction inputs (aligned like Partidos) */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-serif flex-1 text-center text-[#0A0A0A]">
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
                      setPredicciones((prev) => {
                        const prevEntry =
                          prev[p.id] ?? { goles_local: 0, goles_visitante: 0 };
                        return {
                          ...prev,
                          [p.id]: { ...prevEntry, goles_local: val },
                        };
                      });
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
                      setPredicciones((prev) => {
                        const prevEntry =
                          prev[p.id] ?? { goles_local: 0, goles_visitante: 0 };
                        return {
                          ...prev,
                          [p.id]: { ...prevEntry, goles_visitante: val },
                        };
                      });
                    }}
                    disabled={!aprobado || cerrado}
                    className="w-12 h-9 text-center border border-[#CBD5FF] rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[#0052FF]/70"
                  />
                </div>
                <span className="font-serif flex-1 text-center text-[#0A0A0A]">
                  {BANDERAS_POR_EQUIPO[p.equipo_visitante] && (
                    <span className="mr-2">{BANDERAS_POR_EQUIPO[p.equipo_visitante]}</span>
                  )}
                  {p.equipo_visitante}
                </span>
              </div>

              {/* Bottom row: location, real result, Confirmar */}
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
                      onClick={() => guardarPartido(p.id)}
                      disabled={guardando}
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

      {message && (
        <p className="mt-2 text-sm font-serif text-[#2D6A4F] text-center">
          {message}
        </p>
      )}
    </div>
  );
}
