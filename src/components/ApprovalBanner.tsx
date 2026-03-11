"use client";

import { useUser } from "@/context/UserContext";

export default function ApprovalBanner() {
  const { user } = useUser();
  if (!user) return null;
  const approved = user.aprobado && user.pagado;
  if (approved) return null;

  return (
    <div
      className="bg-[#F5E6C8] border-b border-[#E8D4A8] px-4 py-3 flex items-start gap-2 max-w-[430px] mx-auto"
      role="alert"
    >
      <span className="text-[#B8860B] text-lg leading-none flex-shrink-0">⚠</span>
      <div className="font-serif text-sm text-[#0A0A0A]">
        <p className="font-semibold">Debes estar pagado y aprobado para hacer predicciones.</p>
        <p className="text-[#0A0A0A]/80 mt-0.5">Contacta al administrador para más información.</p>
      </div>
    </div>
  );
}
