"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import {
  GRUPOS,
  EQUIPOS_POR_GRUPO,
  TODOS_LOS_EQUIPOS,
  BANDERAS_POR_EQUIPO,
} from "@/lib/constants";
import type { GrupoLetter } from "@/lib/constants";
import { calcularTabla } from "@/lib/tabla";
import type { Partido, User as UserRow } from "@/types/db";

export default function InicioPage() {
  const { user } = useUser();
  const isPlaceholder = (name: string) => name.trim().toUpperCase() === "TBD";
  const [grupo, setGrupo] = useState<GrupoLetter>("A");
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [predicciones, setPredicciones] = useState<Record<string, { goles_local: number; goles_visitante: number }>>({});
  const [campeon, setCampeon] = useState(user?.campeon_predicho ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [adminUsers, setAdminUsers] = useState<UserRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  // Defensive: avoid showing placeholder teams like "TBD" if any old data/constants leak in
  const equipos = [...new Set(EQUIPOS_POR_GRUPO[grupo].filter((e) => e && !isPlaceholder(e)))];

  const formatFechaCorta = (d: string) => {
    const [year, month, day] = d.split("-").map(Number);
    const fecha = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
    return fecha.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  };

  const formatHoraCorta = (h: string | null) => (h ? h.slice(0, 5) : "");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("partidos")
        .select("*")
        .eq("grupo", grupo)
        .eq("fase", "grupos")
        .not("match_no", "is", null)
        .order("match_no", { nullsFirst: false })
        .order("fecha")
        .order("hora");
      if (!cancelled) setPartidos((data as Partido[]) ?? []);
    })();
    return () => { cancelled = true; };
  }, [grupo]);

  useEffect(() => {
    if (!user?.id || partidos.length === 0) return;
    let cancelled = false;
    const partidoIds = partidos.map((p) => p.id);
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
  }, [user?.id, partidos]);

  useEffect(() => {
    if (user?.campeon_predicho) setCampeon(user.campeon_predicho);
  }, [user?.campeon_predicho]);

  // Panel admin: carga de usuarios del grupo
  useEffect(() => {
    if (!user?.es_admin) return;
    let cancelled = false;
    (async () => {
      setAdminLoading(true);
      setAdminError(null);
      const { data, error } = await supabase.rpc("admin_get_group_users");
      if (cancelled) return;
      if (error) {
        // Mostrar mensaje real para depurar RLS/errores de Supabase
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
    <div className="p-4 pb-8 font-sans">
      {/* Panel admin: lista rápida de usuarios para aprobar/pagar */}
      {user?.es_admin && (
        <section className="mb-4 rounded-xl border border-[#E8E3DC] bg-white p-4 shadow-sm">
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
            <div className="max-h-48 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs font-serif">
                <thead>
                  <tr className="border-b border-[#E8E3DC] text-[11px] text-[#0A0A0A]/70">
                    <th className="py-1 pr-2">Usuario</th>
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
                      className="border-b border-[#E8E3DC]/60 text-[11px]"
                    >
                      <td className="py-1 pr-2">
                        <span className="font-medium">{u.username}</span>
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
      )}
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
            {tabla
              .filter((row) => row.equipo && !isPlaceholder(row.equipo))
              .map((row, i) => (
              <tr
                key={row.equipo}
                className={`border-b border-[#E8E3DC]/60 ${i === 1 ? "bg-[#1A3A6B]/05" : ""}`}
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
        <h2 className="font-serif font-bold text-[#0A0A0A]">Haz tus Predicciones — Grupo {grupo}</h2>
        {partidos.map((p, idx) => {
          const cerrado = p.cerrado;
          const pred = predicciones[p.id] ?? { goles_local: 0, goles_visitante: 0 };
          return (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4 flex flex-col gap-3"
            >
              {/* Top row: M# and meta (similar to Partidos) */}
              <div className="flex items-center justify-between mb-2 text-xs font-serif text-[#0A0A0A]/70">
                <span className="font-mono text-[#1A3A6B]">
                  {p.match_no ? `M${p.match_no}` : `M${idx + 1}`}
                </span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden>📅</span>
                    <span>
                      {formatFechaCorta(p.fecha)}
                      {p.hora ? ` · ${formatHoraCorta(p.hora)} CT` : ""}
                    </span>
                  </span>
                  <span className="text-[#1A3A6B] font-medium">Grupo {grupo}</span>
                </div>
              </div>

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
                    className="w-12 h-9 text-center border border-[#D4C9B8] rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/60"
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
                    className="w-12 h-9 text-center border border-[#D4C9B8] rounded-lg font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/60"
                  />
                </div>
                <span className="font-serif flex-1 text-center text-[#0A0A0A]">
                  {BANDERAS_POR_EQUIPO[p.equipo_visitante] && (
                    <span className="mr-2">{BANDERAS_POR_EQUIPO[p.equipo_visitante]}</span>
                  )}
                  {p.equipo_visitante}
                </span>
              </div>

              {/* Bottom row: location + real result */}
              <div className="flex items-center justify-between text-[11px] text-[#0A0A0A]/60 font-serif">
                <span className="inline-flex items-center gap-1">
                  <Image
                    src="/estadio.png"
                    alt=""
                    width={14}
                    height={14}
                    className="opacity-70"
                  />
                  <span>{[p.estadio, p.ciudad].filter(Boolean).join(" — ")}</span>
                </span>
                {p.goles_local_real != null && (
                  <span className="font-mono">
                    Real: {p.goles_local_real}–{p.goles_visitante_real}
                  </span>
                )}
              </div>
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
          {[...new Set(TODOS_LOS_EQUIPOS.map((e) => e.nombre))].map((nombre) => (
            <option key={nombre} value={nombre}>
              {BANDERAS_POR_EQUIPO[nombre] ? `${BANDERAS_POR_EQUIPO[nombre]} ${nombre}` : nombre}
            </option>
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
