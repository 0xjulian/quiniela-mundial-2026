"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { registerSupabaseDevRejectionSuppression } from "@/lib/supabase-dev-rejection-suppression";
import { emailFromUsername } from "@/lib/auth";

registerSupabaseDevRejectionSuppression();

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const submitModeRef = useRef<Mode>("login");
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
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<Mode>("login");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const email = emailFromUsername(username.trim());
    const register = submitModeRef.current === "register";

    try {
      if (register) {
        const phoneTrim = phone.trim();
        if (!phoneTrim) {
          setError("El teléfono es obligatorio para registrarte.");
          setLoading(false);
          return;
        }
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { grupo_code: "GLOBAL", username: username.trim(), phone: phoneTrim } },
        });
        if (signUpError) throw signUpError;
        if (signUpData.user && !signUpData.user.identities?.length) {
          setError("Ya existe un usuario con ese nombre. Inicia sesión.");
          setLoading(false);
          return;
        }
        // Auto-login: misma sesión o hacemos signIn con los mismos datos
        if (!signUpData.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw signInErr;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
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
      <div className="relative z-10 w-full max-w-[380px] flex flex-col min-h-[80vh] pt-8 pb-8">
        <div className="text-center mb-6">
          <h1 className="font-serif text-2xl font-bold text-white drop-shadow-md">
            Quiniela Mundial 2026
          </h1>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-[#E8E3DC] p-6 shadow-lg mt-6">
            <h2 className="font-serif text-lg font-bold text-[#0A0A0A] text-center mb-2">
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </h2>
            <p className="mb-4 text-center text-xs text-[#0A0A0A]/70 font-serif">
              {mode === "login"
                ? "Entra con tu usuario y contraseña."
                : "Usuario, teléfono (para contacto y confirmar pago) y contraseña."}
            </p>
            <form ref={formRef} onSubmit={handleSubmit}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Usuario"
                className="w-full px-4 py-3 border border-[#E8E3DC] rounded-lg font-serif text-[#0A0A0A] mb-3 placeholder:text-[#0A0A0A]/50"
                required
              />
              {mode === "register" && (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Teléfono (obligatorio)"
                  className="w-full px-4 py-3 border border-[#E8E3DC] rounded-lg font-serif text-[#0A0A0A] mb-3 placeholder:text-[#0A0A0A]/50"
                  required
                  minLength={8}
                />
              )}
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
                    setPhone("");
                    setPassword("");
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
              onClick={() => {
                setMode("login");
                submitModeRef.current = "login";
                setShowForm(true);
              }}
              className="w-full py-3 rounded-lg bg-[#008F5D] text-white font-serif font-semibold shadow-lg tracking-wide"
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
                  submitModeRef.current = mode;
                  setError("");
                  formRef.current?.requestSubmit();
                }}
                className="mt-4 w-full py-3 rounded-lg bg-[#008F5D] text-white font-serif font-semibold disabled:opacity-60 tracking-wide"
              >
                {loading
                  ? "..."
                  : mode === "login"
                    ? "Iniciar sesión"
                    : "Crear cuenta"}
              </button>
              <p className="mt-3 text-center text-sm text-white/90 font-serif">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    submitModeRef.current = mode === "login" ? "register" : "login";
                    setError("");
                  }}
                  className="underline"
                >
                  {mode === "login" ? "¿No tienes cuenta? Crear cuenta" : "¿Ya tienes cuenta? Iniciar sesión"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
