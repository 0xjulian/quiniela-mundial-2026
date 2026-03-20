"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { User, Grupo, Partido } from "@/types/db";
import { useUser } from "@/context/UserContext";
import {
  FASES_ELIMINATORIA_ORDEN,
  NOMBRES_EQUIPOS_ORDENADOS,
  etiquetaFaseEliminatoria,
} from "@/lib/constants";
import { opcionesSelectHuecoEliminatoria } from "@/lib/knockout-slot-options";
import { MatchCardHeader } from "@/components/MatchCardHeader";

type EditableUser = User;

export default function AdminPage() {
  const { user, loading } = useUser();
  const [users, setUsers] = useState<EditableUser[]>([]);
  const [grupoConfig, setGrupoConfig] = useState<Pick<Grupo, "codigo" | "campeon_real" | "goleador_real"> | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [knockoutPartidos, setKnockoutPartidos] = useState<Partido[]>([]);
  const [partidosGruposAdmin, setPartidosGruposAdmin] = useState<Partido[]>([]);
  const [loadingKnockout, setLoadingKnockout] = useState(true);
  const [faseElimTab, setFaseElimTab] = useState<string>("dieciseisavos");
  const [draftEquipos, setDraftEquipos] = useState<Record<string, { local: string; visitante: string }>>({});
  const [savingPartidoId, setSavingPartidoId] = useState<string | null>(null);
  const [publishingFase, setPublishingFase] = useState<string | null>(null);
  const [editarCrucesEliminatoria, setEditarCrucesEliminatoria] = useState(false);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const loadKnockout = async () => {
    setLoadingKnockout(true);
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

    setPartidosGruposAdmin((gRes.data as Partido[]) ?? []);

    if (koRes.error) {
      setError("No se pudieron cargar los partidos de eliminatoria.");
      setKnockoutPartidos([]);
    } else {
      const lista = (koRes.data as Partido[]) ?? [];
      setKnockoutPartidos(lista);
      setDraftEquipos(
        lista.reduce(
          (acc, p) => {
            acc[p.id] = { local: p.equipo_local, visitante: p.equipo_visitante };
            return acc;
          },
          {} as Record<string, { local: string; visitante: string }>
        )
      );
    }
    setLoadingKnockout(false);
  };

  const todosParaHuecosAdmin = useMemo(
    () => [...partidosGruposAdmin, ...knockoutPartidos],
    [partidosGruposAdmin, knockoutPartidos]
  );

  useEffect(() => {
    if (!user || !user.es_admin) return;
    (async () => {
      setError(null);
      setLoadingData(true);

      // Cargar configuración del grupo (campeón y goleador reales)
      const { data: grupoData, error: grupoError } = await supabase
        .from("grupos")
        .select("codigo, campeon_real, goleador_real")
        .eq("codigo", user.grupo_code)
        .maybeSingle();

      if (!grupoError && grupoData) {
        setGrupoConfig(grupoData as Pick<Grupo, "codigo" | "campeon_real" | "goleador_real">);
      }

      // Cargar usuarios del mismo grupo (solo jugadores, no admins)
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("grupo_code", user.grupo_code)
        .eq("es_admin", false)
        .order("created_at", { ascending: true });

      if (usersError) {
        setError("No se pudieron cargar los usuarios.");
      } else {
        setUsers((usersData as EditableUser[]) ?? []);
      }

      await loadKnockout();

      setLoadingData(false);
    })();
  }, [user, supabase]);

  const toggleUserField = async (id: string, field: "aprobado" | "pagado") => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    const newValue = !target[field];

    const previous = [...users];
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, [field]: newValue } : u))
    );

    const { error: updateError } = await supabase
      .from("users")
      .update({ [field]: newValue })
      .eq("id", id);

    if (updateError) {
      setError("No se pudo actualizar el usuario.");
      setUsers(previous);
    }
  };

  const guardarConfigGrupo = async () => {
    if (!user || !grupoConfig) return;
    setSavingConfig(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("grupos")
      .update({
        campeon_real: grupoConfig.campeon_real ?? null,
        goleador_real: grupoConfig.goleador_real ?? null,
      })
      .eq("codigo", user.grupo_code);

    if (updateError) {
      setError("No se pudo guardar el campeón / goleador reales.");
    }
    setSavingConfig(false);
  };

  const guardarEquiposPartido = async (partidoId: string) => {
    const d = draftEquipos[partidoId];
    if (!d) return;
    const local = d.local.trim();
    const visitante = d.visitante.trim();
    if (!local || !visitante) {
      setError("Elige equipo local y visitante antes de guardar.");
      return;
    }
    setSavingPartidoId(partidoId);
    setError(null);
    const { error: upErr } = await supabase
      .from("partidos")
      .update({ equipo_local: local, equipo_visitante: visitante })
      .eq("id", partidoId);
    setSavingPartidoId(null);
    if (upErr) {
      setError("No se pudo guardar el partido de eliminatoria.");
      return;
    }
    setKnockoutPartidos((prev) =>
      prev.map((p) =>
        p.id === partidoId ? { ...p, equipo_local: local, equipo_visitante: visitante } : p
      )
    );
  };

  const publicarFase = async (fase: string) => {
    const ids = knockoutPartidos.filter((p) => p.fase === fase).map((p) => p.id);
    if (ids.length === 0) return;
    setPublishingFase(fase);
    setError(null);
    const now = new Date().toISOString();
    const { error: upErr } = await supabase.from("partidos").update({ published_at: now }).in("id", ids);
    setPublishingFase(null);
    if (upErr) {
      setError("No se pudo publicar la fase.");
      return;
    }
    setKnockoutPartidos((prev) =>
      prev.map((p) => (p.fase === fase ? { ...p, published_at: now } : p))
    );
  };

  const ocultarFase = async (fase: string) => {
    const ids = knockoutPartidos.filter((p) => p.fase === fase).map((p) => p.id);
    if (ids.length === 0) return;
    setPublishingFase(fase);
    setError(null);
    const { error: upErr } = await supabase.from("partidos").update({ published_at: null }).in("id", ids);
    setPublishingFase(null);
    if (upErr) {
      setError("No se pudo ocultar la fase.");
      return;
    }
    setKnockoutPartidos((prev) =>
      prev.map((p) => (p.fase === fase ? { ...p, published_at: null } : p))
    );
  };

  const partidosFaseActiva = knockoutPartidos.filter((p) => p.fase === faseElimTab);
  const fasePublicada =
    partidosFaseActiva.length > 0 && partidosFaseActiva.every((p) => p.published_at);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F2ED] font-serif text-[#0A0A0A]">
        Cargando...
      </div>
    );
  }

  if (!user || !user.es_admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F2ED] font-serif text-[#0A0A0A]">
        <div className="max-w-sm rounded-xl bg-white p-6 text-center shadow-sm border border-[#E8E3DC]">
          <p className="font-semibold mb-2">No autorizado</p>
          <p className="text-sm text-[#0A0A0A]/70">
            Esta sección es solo para administradores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 space-y-6">
      <h1 className="font-serif text-xl font-bold text-[#0A0A0A]">
        Panel de administración
      </h1>

      {error && (
        <div className="rounded-lg bg-[#C8392B]/5 border border-[#C8392B]/40 px-3 py-2 text-sm text-[#C8392B] font-serif">
          {error}
        </div>
      )}

      {loadingData ? (
        <p className="font-serif text-sm text-[#0A0A0A]/70">Cargando datos…</p>
      ) : (
        <>
          {/* Configuración de campeón y goleador reales */}
          <section className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4">
            <h2 className="font-serif font-bold text-[#0A0A0A] mb-3">
              Campeón y goleador reales ({user.grupo_code})
            </h2>
            <p className="text-xs text-[#0A0A0A]/70 font-serif mb-3">
              Aquí se cargan los resultados finales oficiales del torneo. Estos valores
              se usarán para asignar puntos cuando termine el Mundial.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A]/80 mb-1">
                  Campeón del Mundial (real)
                </label>
                <select
                  className="w-full rounded-md border border-[#E8E3DC] px-3 py-2 text-sm font-serif bg-white"
                  value={grupoConfig?.campeon_real ?? ""}
                  onChange={(e) =>
                    setGrupoConfig((prev) =>
                      prev
                        ? { ...prev, campeon_real: e.target.value || null }
                        : {
                            codigo: user.grupo_code,
                            campeon_real: e.target.value || null,
                            goleador_real: "",
                          }
                    )
                  }
                >
                  <option value="">— Elegir selección —</option>
                  {(grupoConfig?.campeon_real &&
                  !NOMBRES_EQUIPOS_ORDENADOS.includes(grupoConfig.campeon_real)
                    ? [grupoConfig.campeon_real, ...NOMBRES_EQUIPOS_ORDENADOS]
                    : NOMBRES_EQUIPOS_ORDENADOS
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0A0A0A]/80 mb-1">
                  Goleador del torneo (real)
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-[#E8E3DC] px-3 py-2 text-sm font-serif"
                  placeholder="Ej. Mbappé"
                  value={grupoConfig?.goleador_real ?? ""}
                  onChange={(e) =>
                    setGrupoConfig((prev) =>
                      prev
                        ? { ...prev, goleador_real: e.target.value }
                        : { codigo: user.grupo_code, campeon_real: "", goleador_real: e.target.value }
                    )
                  }
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={guardarConfigGrupo}
                  disabled={savingConfig}
                  className="rounded-md bg-[#1A3A6B] px-4 py-2 text-sm text-white font-semibold disabled:opacity-60"
                >
                  {savingConfig ? "Guardando..." : "Guardar configuración"}
                </button>
              </div>
            </div>
          </section>

          {/* Fase eliminatoria — bracket y publicación */}
          <section className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4">
            <h2 className="font-serif font-bold text-[#0A0A0A] mb-2">
              Fase eliminatoria (M73–M104)
            </h2>
            <p className="text-xs text-[#0A0A0A]/70 font-serif mb-2">
              Los <strong>cruces y procedencias</strong> ya vienen del calendario (M73–M104). Solo usa{" "}
              <strong>Publicar fase</strong> cuando quieras que los usuarios vean predicciones y resultados
              en <strong>Partidos</strong> y <strong>Resultados</strong>. Activa &quot;Editar cruces&quot; o
              edita equipos también en <strong>Partidos</strong> / <strong>Resultados</strong> (vista admin).
            </p>
            <label className="flex items-center gap-2 mb-3 text-xs font-serif text-[#0A0A0A]/85 cursor-pointer">
              <input
                type="checkbox"
                checked={editarCrucesEliminatoria}
                onChange={(e) => setEditarCrucesEliminatoria(e.target.checked)}
                className="rounded border-[#E8E3DC]"
              />
              <span>Editar cruces manualmente (avanzado)</span>
            </label>
            {loadingKnockout ? (
              <p className="text-sm text-[#0A0A0A]/70 font-serif">Cargando eliminatoria…</p>
            ) : knockoutPartidos.length === 0 ? (
              <p className="text-sm text-[#0A0A0A]/70 font-serif">
                No hay partidos de eliminatoria en la base. Ejecuta en Supabase{" "}
                <code className="text-[11px] bg-[#F5F2ED] px-1 rounded">10-knockout-migration.sql</code> y{" "}
                <code className="text-[11px] bg-[#F5F2ED] px-1 rounded">11-seed-knockout-partidos.sql</code>.
              </p>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                  {FASES_ELIMINATORIA_ORDEN.map((f) => {
                    const count = knockoutPartidos.filter((p) => p.fase === f).length;
                    const pub = knockoutPartidos.filter((p) => p.fase === f).every((p) => p.published_at);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFaseElimTab(f)}
                        className={`flex-shrink-0 px-3 py-2 rounded-full font-serif text-xs font-semibold transition-colors ${
                          faseElimTab === f
                            ? "bg-[#1A3A6B] text-white"
                            : "bg-[#E0EAFF] text-[#00163A]/80"
                        }`}
                      >
                        {etiquetaFaseEliminatoria(f)}
                        <span className="opacity-80"> ({count})</span>
                        {pub && count > 0 ? (
                          <span className="ml-1 text-[10px] font-normal">· visible</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    type="button"
                    disabled={!!publishingFase || partidosFaseActiva.length === 0}
                    onClick={() => publicarFase(faseElimTab)}
                    className="rounded-md bg-[#0D7A3E] px-3 py-2 text-xs text-white font-semibold disabled:opacity-50"
                  >
                    {publishingFase === faseElimTab ? "Publicando…" : `Publicar ${etiquetaFaseEliminatoria(faseElimTab)}`}
                  </button>
                  <button
                    type="button"
                    disabled={!!publishingFase || !fasePublicada}
                    onClick={() => ocultarFase(faseElimTab)}
                    className="rounded-md border border-[#E8E3DC] px-3 py-2 text-xs font-semibold text-[#0A0A0A]/80 disabled:opacity-50"
                  >
                    {publishingFase === faseElimTab ? "…" : "Ocultar fase"}
                  </button>
                </div>
                <ul className="space-y-4">
                  {partidosFaseActiva.map((p) => {
                    const draft = draftEquipos[p.id] ?? {
                      local: p.equipo_local,
                      visitante: p.equipo_visitante,
                    };
                    const optsL = opcionesSelectHuecoEliminatoria(
                      p,
                      "local",
                      draft.local,
                      todosParaHuecosAdmin
                    );
                    const optsV = opcionesSelectHuecoEliminatoria(
                      p,
                      "visitante",
                      draft.visitante,
                      todosParaHuecosAdmin
                    );
                    return (
                      <li
                        key={p.id}
                        className="rounded-lg border border-[#E8E3DC] bg-[#FAFAF8] p-3 space-y-2"
                      >
                        <MatchCardHeader
                          matchNoDisplay={`M${p.match_no}`}
                          phaseLabel={
                            <span className="flex flex-col gap-0.5 items-start text-left">
                              <span className="text-[#0052FF] font-semibold text-[10px] sm:text-xs">
                                {etiquetaFaseEliminatoria(p.fase)}
                              </span>
                              <span
                                className={
                                  p.published_at
                                    ? "text-[10px] font-normal text-[#0D7A3E]"
                                    : "text-[10px] font-normal text-[#0A0A0A]/50"
                                }
                              >
                                {p.published_at ? "Publicado" : "Borrador"}
                              </span>
                            </span>
                          }
                          fecha={p.fecha}
                          hora={p.hora}
                          matchNoClassName="text-[#0A0A0A] text-sm font-bold font-serif"
                          phaseClassName=""
                          extraRight={
                            <span className="text-[10px] text-[#0A0A0A]/55 font-serif block max-w-[220px] sm:max-w-none text-right">
                              {p.estadio ?? "—"}
                              {p.ciudad ? ` — ${p.ciudad}` : ""}
                            </span>
                          }
                        />
                        {!editarCrucesEliminatoria ? (
                          <p className="text-sm font-serif text-center text-[#0A0A0A]/90 py-2">
                            <span className="font-semibold">{p.equipo_local}</span>
                            <span className="mx-2 text-[#0A0A0A]/50">vs</span>
                            <span className="font-semibold">{p.equipo_visitante}</span>
                          </p>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-[#0A0A0A]/70 mb-0.5">
                                  Local
                                </label>
                                <select
                                  className="w-full rounded-md border border-[#E8E3DC] px-2 py-1.5 text-xs font-serif bg-white"
                                  value={draft.local}
                                  onChange={(e) =>
                                    setDraftEquipos((prev) => ({
                                      ...prev,
                                      [p.id]: { ...draft, local: e.target.value },
                                    }))
                                  }
                                >
                                  {optsL.map((n) => (
                                    <option key={`${p.id}-l-${n}`} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-[#0A0A0A]/70 mb-0.5">
                                  Visitante
                                </label>
                                <select
                                  className="w-full rounded-md border border-[#E8E3DC] px-2 py-1.5 text-xs font-serif bg-white"
                                  value={draft.visitante}
                                  onChange={(e) =>
                                    setDraftEquipos((prev) => ({
                                      ...prev,
                                      [p.id]: { ...draft, visitante: e.target.value },
                                    }))
                                  }
                                >
                                  {optsV.map((n) => (
                                    <option key={`${p.id}-v-${n}`} value={n}>
                                      {n}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={savingPartidoId === p.id}
                              onClick={() => guardarEquiposPartido(p.id)}
                              className="w-full sm:w-auto rounded-md bg-[#1A3A6B] px-3 py-1.5 text-xs text-white font-semibold disabled:opacity-60"
                            >
                              {savingPartidoId === p.id ? "Guardando…" : "Guardar equipos"}
                            </button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>

          {/* Gestión de usuarios */}
          <section className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4">
            <h2 className="font-serif font-bold text-[#0A0A0A] mb-3">
              Usuarios ({user.grupo_code})
            </h2>
            {users.length === 0 ? (
              <p className="text-sm text-[#0A0A0A]/70 font-serif">
                No hay usuarios en este grupo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-serif">
                  <thead>
                    <tr className="border-b border-[#E8E3DC] text-xs text-[#0A0A0A]/70">
                      <th className="py-2 pr-2">Usuario</th>
                      <th className="py-2 px-2">Teléfono</th>
                      <th className="py-2 px-2 text-center">Aprobado</th>
                      <th className="py-2 px-2 text-center">Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-[#E8E3DC]/60 text-xs"
                      >
                        <td className="py-2 pr-2">
                          <span className="font-medium">{u.username}</span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="text-[11px] text-[#0A0A0A]/80">
                            {u.telefono || "–"}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={u.aprobado}
                            onChange={() => toggleUserField(u.id, "aprobado")}
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
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
        </>
      )}
    </div>
  );
}

