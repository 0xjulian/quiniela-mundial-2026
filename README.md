# Quiniela Mundial FIFA 2026

Web app de predicciones para el Mundial FIFA 2026 (USA, Canadá, México). Pensada para grupos privados (amigos/familia). Stack: **Next.js**, **Supabase**, **Vercel**.

## Requisitos

- Node 18+
- Cuenta [Supabase](https://supabase.com) y [Vercel](https://vercel.com)

## Instalación

```bash
npm install
cp .env.local.example .env.local
```

En `.env.local` define:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Base de datos (Supabase) — un solo paso

1. Crea un proyecto en Supabase.
2. En **SQL Editor** → Nueva query → pega **todo** el contenido de `supabase/init.sql` → Run.
   - Eso crea tablas, RLS, el grupo GLOBAL y los 72 partidos de fase de grupos. No hace falta ejecutar otros scripts.
3. En **Authentication > Providers** (Email): si quieres que “Crear cuenta” deje entrar sin confirmar correo, desactiva **Confirm email**.

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000): splash 1,5 s → pantalla de acceso. **Crear cuenta**: usuario, teléfono (opcional) y contraseña (≥ 6 caracteres) → entras directo. **Iniciar sesión**: usuario y contraseña. En Supabase puedes marcar `aprobado = true` y `pagado = true` en la tabla `users` para permitir predicciones.

## Build y deploy

```bash
npm run build
npm run start
```

En Vercel: conecta el repo y configura las mismas variables de entorno.

## Estructura

- **Inicio**: selector de grupo (A–L), tabla predicha, partidos del grupo con inputs de marcador, elección de campeón (+5 pts).
- **Resultados**: podio, tabla de puntos (exactos, correctos, dinero).
- **Partidos**: lista de partidos con resultado real o “pendiente”.
- **Reglas**: sistema de puntos, cierre de predicciones, premio.

## Roles

- **Admin**: aprobar/desaprobar participantes, cargar resultados reales, gestionar grupo (desde Supabase o una futura zona admin).
- **Participante**: registrarse con código de grupo, hacer predicciones, ver leaderboard.

## Diseño

- Mobile-first (max-width 430px), responsive.
- Paleta: fondo #F5F2ED, cards #FFFFFF, acento #D4A843, azul FIFA #1A3A6B, alerta #C8392B.
- Tipografía: Georgia / Times New Roman (serif), Courier New (marcadores/números).
