-- Quiniela Mundial FIFA 2026 — Schema Supabase
-- Ejecutar en el SQL Editor de tu proyecto Supabase

-- Grupos (código único por quiniela privada)
CREATE TABLE IF NOT EXISTS grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  admin_id UUID REFERENCES auth.users(id),
  distribucion_premios JSONB DEFAULT '{"1": 50, "2": 30, "3": 20}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Perfil de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  grupo_code TEXT NOT NULL REFERENCES grupos(codigo),
  aprobado BOOLEAN DEFAULT false,
  pagado BOOLEAN DEFAULT false,
  es_admin BOOLEAN DEFAULT false,
  campeon_predicho TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(grupo_code, username)
);

-- Equipos del Mundial (48 equipos, 12 grupos A–L)
CREATE TABLE IF NOT EXISTS equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  grupo CHAR(1) NOT NULL CHECK (grupo ~ '^[A-L]$'),
  bandera_emoji TEXT DEFAULT '🏳️'
);

-- Partidos (fase de grupos + eliminatoria)
CREATE TABLE IF NOT EXISTS partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo CHAR(1) NOT NULL,
  equipo_local TEXT NOT NULL,
  equipo_visitante TEXT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME,
  ciudad TEXT,
  goles_local_real INTEGER,
  goles_visitante_real INTEGER,
  cerrado BOOLEAN DEFAULT false,
  fase TEXT NOT NULL DEFAULT 'grupos' CHECK (fase IN ('grupos', 'octavos', 'cuartos', 'semifinales', 'tercero', 'final')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Predicciones por partido
CREATE TABLE IF NOT EXISTS predicciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  goles_local INTEGER NOT NULL DEFAULT 0,
  goles_visitante INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, partido_id)
);

-- Puntos obtenidos (calculados o manuales)
CREATE TABLE IF NOT EXISTS puntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partido_id UUID REFERENCES partidos(id) ON DELETE SET NULL,
  puntos_obtenidos INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL CHECK (tipo IN ('exacto', 'correcto', 'tabla', 'campeon')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_grupo ON users(grupo_code);
CREATE INDEX IF NOT EXISTS idx_predicciones_user ON predicciones(user_id);
CREATE INDEX IF NOT EXISTS idx_predicciones_partido ON predicciones(partido_id);
CREATE INDEX IF NOT EXISTS idx_partidos_grupo ON partidos(grupo);
CREATE INDEX IF NOT EXISTS idx_partidos_fecha ON partidos(fecha);
CREATE INDEX IF NOT EXISTS idx_puntos_user ON puntos(user_id);

-- RLS
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE predicciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE puntos ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios ven solo su grupo
CREATE POLICY "Usuarios ven su grupo" ON grupos FOR SELECT
  USING (codigo IN (SELECT grupo_code FROM users WHERE id = auth.uid()));

CREATE POLICY "Admin gestiona su grupo" ON grupos FOR ALL
  USING ((SELECT es_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Usuarios ven perfiles de su grupo" ON users FOR SELECT
  USING (grupo_code IN (SELECT grupo_code FROM users WHERE id = auth.uid()));

CREATE POLICY "Usuario actualiza su perfil" ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Usuario inserta su perfil al registrarse" ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Todos autenticados ven partidos" ON partidos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin actualiza partidos" ON partidos FOR UPDATE
  USING ((SELECT es_admin FROM users WHERE id = auth.uid()) = true);

CREATE POLICY "Usuario ve y crea sus predicciones" ON predicciones FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Usuario ve sus puntos" ON puntos FOR SELECT
  USING (user_id = auth.uid());

-- Trigger: crear perfil al registrarse (opcional, si usas signUp)
-- Comentado: el registro lo hacemos desde la app con grupo_code + username
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   INSERT INTO public.users (id, username, grupo_code)
--   VALUES (NEW.id, split_part(NEW.email, '@', 1), ...);
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
