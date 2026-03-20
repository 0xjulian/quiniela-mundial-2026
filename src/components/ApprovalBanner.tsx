"use client";

import { useUser } from "@/context/UserContext";

export default function ApprovalBanner() {
  const { user } = useUser();
  if (!user) return null;
  // El admin no ve este banner; solo aplica a jugadores.
  if (user.es_admin) return null;
  const approved = user.aprobado && user.pagado;
  if (approved) return null;

  const whatsAppUrl = "https://chat.whatsapp.com/KRPRllDdWvG3yuyJolTO7F?mode=gi_t";

  return (
    <div
      className="bg-[#F5E6C8] border-b border-[#E8D4A8] px-4 py-3 flex flex-col gap-2 max-w-[430px] mx-auto"
      role="alert"
    >
      <div className="flex items-start gap-2">
        <span className="text-[#B8860B] text-lg leading-none flex-shrink-0">⚠</span>
        <div className="font-serif text-sm text-[#0A0A0A]">
          <p className="font-semibold">Debes estar pagado y aprobado para hacer predicciones.</p>
          <p className="text-[#0A0A0A]/80 mt-0.5">Únete al grupo de WhatsApp para confirmar pago y recibir anuncios.</p>
        </div>
      </div>
      <a
        href={whatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#25D366] text-white font-serif text-sm font-medium hover:opacity-90"
      >
        <span aria-hidden>📱</span> Unirse al grupo de WhatsApp
      </a>
    </div>
  );
}
