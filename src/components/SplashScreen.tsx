"use client";

import Image from "next/image";

export default function SplashScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#0f1c2e]">
      <Image
        src="/splash quiniela.png"
        alt="FIFA World Cup 2026"
        fill
        className="object-cover object-center"
        priority
        sizes="100vw"
      />
    </div>
  );
}
