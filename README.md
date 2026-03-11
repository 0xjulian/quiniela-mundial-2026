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

## Base de datos (Supabase)

1. Crea un proyecto en Supabase.
2. En **SQL Editor** ejecuta en este orden:
   - `supabase/schema.sql`
   - Opcional: crea al menos un grupo, por ejemplo:
     ```sql
     INSERT INTO grupos (codigo, nombre) VALUES ('FAMILIA2026', 'Quiniela Familia');
     ```
   - `supabase/seed-partidos.sql` (partidos de fase de grupos)
3. En **Authentication > Providers** deja habilitado Email; si quieres registro sin confirmar correo, desactiva "Confirm email" en Email.

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000): splash → Continuar → Login. Para probar, regístrate con un código de grupo que exista en la tabla `grupos` (ej. `FAMILIA2026`), usuario y contraseña. Luego en Supabase marca a ese usuario `aprobado = true` y `pagado = true` para poder hacer predicciones.

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
