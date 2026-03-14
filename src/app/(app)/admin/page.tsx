"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { User, Partido } from "@/types/db";
import { useUser } from "@/context/UserContext";

type EditableUser = User;

interface EditablePartido extends Partido {
  goles_local_real_input: string;
  goles_visitante_real_input: string;
  saving?: boolean;
}

export default function AdminPage() {
  const { user, loading } = useUser();
  const [users, setUsers] = useState<EditableUser[]>([]);
  const [partidos, setPartidos] = useState<EditablePartido[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  useEffect(() => {
    if (!user || !user.es_admin) return;
    (async () => {
      setError(null);
      setLoadingData(true);

      // Cargar usuarios del mismo grupo
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("grupo_code", user.grupo_code)
        .order("created_at", { ascending: true });

      if (usersError) {
        setError("No se pudieron cargar los usuarios.");
      } else {
        setUsers((usersData as EditableUser[]) ?? []);
      }

      // Cargar partidos de fase de grupos (solo reales, con match_no)
      const { data: partidosData, error: partidosError } = await supabase
        .from("partidos")
        .select("*")
        .eq("fase", "grupos")
        .not("match_no", "is", null)
        .order("match_no", { ascending: true });

      if (partidosError) {
        setError("No se pudieron cargar los partidos.");
      } else {
        setPartidos(
          ((partidosData as Partido[]) ?? []).map((p) => ({
            ...p,
            goles_local_real_input:
              p.goles_local_real !== null && p.goles_local_real !== undefined
                ? String(p.goles_local_real)
                : "",
            goles_visitante_real_input:
              p.goles_visitante_real !== null && p.goles_visitante_real !== undefined
                ? String(p.goles_visitante_real)
                : "",
          }))
        );
      }

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

  const updateResultado = async (id: string) => {
    setPartidos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, saving: true } : p))
    );

    const partido = partidos.find((p) => p.id === id);
    if (!partido) return;

    const gl = partido.goles_local_real_input.trim();
    const gv = partido.goles_visitante_real_input.trim();

    const glNum = gl === "" ? null : Number(gl);
    const gvNum = gv === "" ? null : Number(gv);

    const { error: updateError } = await supabase
      .from("partidos")
      .update({
        goles_local_real: glNum,
        goles_visitante_real: gvNum,
        cerrado: glNum !== null && gvNum !== null,
      })
      .eq("id", id);

    if (updateError) {
      setError("No se pudo guardar el resultado.");
      setPartidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, saving: false } : p))
      );
      return;
    }

    setPartidos((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              goles_local_real: glNum,
              goles_visitante_real: gvNum,
              saving: false,
            }
          : p
      )
    );
  };

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

          {/* Resultados fase de grupos */}
          <section className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4">
            <h2 className="font-serif font-bold text-[#0A0A0A] mb-3">
              Resultados — Fase de grupos
            </h2>
            {partidos.length === 0 ? (
              <p className="text-sm text-[#0A0A0A]/70 font-serif">
                No hay partidos cargados.
              </p>
            ) : (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {partidos.map((p) => (
                  <div
                    key={p.id}
                    className="border border-[#E8E3DC] rounded-lg p-3 text-xs font-serif flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[11px] text-[#0A0A0A]/70">
                        {p.match_no ? `M${p.match_no}` : ""} · Grupo {p.grupo}
                      </span>
                      <span className="text-[11px] text-[#0A0A0A]/70">
                        {p.fecha} {p.hora ? `· ${p.hora} CT` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex-1 text-right">{p.equipo_local}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          className="w-10 rounded border border-[#E8E3DC] px-1 py-0.5 text-center text-[11px]"
                          value={p.goles_local_real_input}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPartidos((prev) =>
                              prev.map((x) =>
                                x.id === p.id
                                  ? { ...x, goles_local_real_input: value }
                                  : x
                              )
                            );
                          }}
                        />
                        <span className="font-mono text-[11px] text-[#0A0A0A]/70">
                          -
                        </span>
                        <input
                          type="number"
                          min={0}
                          className="w-10 rounded border border-[#E8E3DC] px-1 py-0.5 text-center text-[11px]"
                          value={p.goles_visitante_real_input}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPartidos((prev) =>
                              prev.map((x) =>
                                x.id === p.id
                                  ? { ...x, goles_visitante_real_input: value }
                                  : x
                              )
                            );
                          }}
                        />
                      </div>
                      <span className="flex-1 text-left">{p.equipo_visitante}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-[#0A0A0A]/60">
                      <span>
                        {p.estadio
                          ? `${p.estadio}${p.ciudad ? ` — ${p.ciudad}` : ""}`
                          : p.ciudad || "–"}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateResultado(p.id)}
                        disabled={p.saving}
                        className="rounded-md bg-[#1A3A6B] px-3 py-1 text-[11px] text-white font-medium disabled:opacity-60"
                      >
                        {p.saving ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

