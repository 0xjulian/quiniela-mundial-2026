"use client";

import { PUNTOS_EXACTO, PUNTOS_RESULTADO, PUNTOS_TABLA_POR_POSICION, PUNTOS_CAMPEON, PUNTOS_GOLEADOR } from "@/lib/constants";

const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/KRPRllDdWvG3yuyJolTO7F?mode=gi_t";

export default function ReglasPage() {
  return (
    <div className="p-4 pb-8">
      <h1 className="font-serif text-xl font-bold text-[#0A0A0A] mb-4">Reglas</h1>

      <div className="space-y-6 font-serif text-[#0A0A0A]">
        <section className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4">
          <h2 className="font-semibold text-[#1A3A6B] mb-2">Comunicación y WhatsApp</h2>
          <p className="text-sm mb-3">
            El grupo de WhatsApp es el canal oficial para anuncios, confirmación de pago de la quiniela y acceso como participante aprobado. Únete para estar al día y poder confirmar tu pago.
          </p>
          <a
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#25D366] text-white font-medium text-sm hover:opacity-90"
          >
            <span aria-hidden>📱</span> Unirse al grupo de WhatsApp
          </a>
        </section>

        <section className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4">
          <h2 className="font-semibold text-[#1A3A6B] mb-2">Sistema de puntos</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Fase de grupos — Partidos:</strong>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>+{PUNTOS_EXACTO} pts por resultado exacto (ej. predices 3-1 y queda 3-1)</li>
                <li>+{PUNTOS_RESULTADO} pt por resultado correcto (mismo ganador/empate, distinto marcador)</li>
              </ul>
            </li>
            <li>
              <strong>Fase de grupos — Tabla de posiciones:</strong>
              <br />
              <span className="ml-4">
                +{PUNTOS_TABLA_POR_POSICION} pt por cada equipo que quede en la posición que predijiste (máx. 4 pts por grupo, 48 pts en total).
              </span>
            </li>
            <li>
              <strong>Fase eliminatoria:</strong>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>+{PUNTOS_EXACTO} pts por resultado exacto</li>
                <li>+{PUNTOS_RESULTADO} pt por resultado correcto (ganador acertado)</li>
              </ul>
            </li>
            <li>
              <strong>Bonus:</strong>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li>+{PUNTOS_CAMPEON} pts si acertaste al campeón del Mundial (se elige antes del primer partido).</li>
                <li>+{PUNTOS_GOLEADOR} pts si acertaste al goleador del torneo.</li>
              </ul>
            </li>
          </ul>
        </section>

        <section className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4">
          <h2 className="font-semibold text-[#1A3A6B] mb-2">Cierre de predicciones</h2>
          <p className="text-sm">
            Las predicciones de cada partido se cierran automáticamente 5 minutos antes del inicio de ese partido. La predicción del campeón se cierra antes del primer partido del torneo.
          </p>
        </section>

        <section className="bg-white rounded-xl border border-[#E8E3DC] shadow-sm p-4">
          <h2 className="font-semibold text-[#1A3A6B] mb-2">Premio</h2>
          <p className="text-sm">
            Hay un bote de dinero que se reparte entre los 3 primeros lugares al final del torneo. El administrador define el porcentaje por posición y controla quién está pagado y aprobado para participar.
          </p>
        </section>
      </div>
    </div>
  );
}
