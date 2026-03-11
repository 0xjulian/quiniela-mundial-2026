"use client";

import { useUser } from "@/context/UserContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  if (loading) return <div className="flex min-h-screen items-center justify-center font-serif">Cargando...</div>;
  if (!user) return null;
  return <>{children}</>;
}
