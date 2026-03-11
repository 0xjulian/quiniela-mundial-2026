"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { emailFromUsername } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const submitModeRef = useRef<"login" | "register">("login");
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        if (session) router.replace("/inicio");
      });
  }, [router]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const email = emailFromUsername(username.trim());
    const register = submitModeRef.current === "register";

    try {
      if (register) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { grupo_code: "GLOBAL", username: username.trim() } },
        });
        if (signUpError) throw signUpError;
        if (signUpData.user && !signUpData.user.identities?.length) {
          setError("Ya existe un usuario con ese nombre. Inicia sesión.");
          setLoading(false);
          return;
        }
        setError("Cuenta creada. Ahora inicia sesión con tu usuario y contraseña.");
        setLoading(false);
        submitModeRef.current = "login";
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      router.push("/inicio");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/login.png)" }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[#0A0A0A]/40" aria-hidden />
      <div
        className="relative z-10 w-full max-w-[380px] flex flex-col min-h-[80vh] pt-8 pb-8"
        onClick={() => {
          if (showForm && !loading) {
            setShowForm(false);
            setError("");
          }
        }}
      >
        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl font-bold text-white drop-shadow-md">
            Quiniela Mundial 2026
          </h1>
        </div>

        {showForm && (
          <div
            className="bg-white rounded-xl border border-[#E8E3DC] p-6 shadow-lg mt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-lg font-bold text-[#0A0A0A] text-center mb-6">Acceso</h2>
            <form ref={formRef} onSubmit={handleSubmit}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuario"
                className="w-full px-4 py-3 border border-[#E8E3DC] rounded-lg font-serif text-[#0A0A0A] mb-3 placeholder:text-[#0A0A0A]/50"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full px-4 py-3 border border-[#E8E3DC] rounded-lg font-serif text-[#0A0A0A] mb-4 placeholder:text-[#0A0A0A]/50"
                required
              />

              {error && (
                <p className="text-[#C8392B] text-sm mb-2" role="alert">
                  {error}
                </p>
              )}

              <p className="text-center mt-2 text-xs text-[#0A0A0A]/70 font-serif">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                  className="underline"
                >
                  Cancelar
                </button>
              </p>
            </form>
          </div>
        )}

        <div className="mt-auto">
          {!showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-lg bg-[#1A3A6B] text-white font-serif font-medium shadow-lg"
            >
              Iniciar sesión / Crear cuenta
            </button>
          )}

          {showForm && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  submitModeRef.current = "login";
                  setError("");
                  formRef.current?.requestSubmit();
                }}
                className="mt-4 w-full py-3 rounded-lg bg-[#1A3A6B] text-white font-serif font-medium disabled:opacity-60"
              >
                {loading && submitModeRef.current === "login" ? "..." : "Iniciar sesión"}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  submitModeRef.current = "register";
                  setError("");
                  formRef.current?.requestSubmit();
                }}
                className="mt-3 w-full text-sm text-white font-serif underline disabled:opacity-60"
              >
                {loading && submitModeRef.current === "register" ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
