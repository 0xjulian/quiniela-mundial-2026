-- =============================================================================
-- 01 — SCHEMA: tablas e índices únicamente
-- Quiniela Mundial FIFA 2026
-- Ejecutar primero en el SQL Editor. Sin RLS, sin datos, sin triggers.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tablas
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  admin_id UUID REFERENCES auth.users(id),
  distribucion_premios JSONB DEFAULT '{"1": 50, "2": 30, "3": 20}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  grupo CHAR(1) NOT NULL CHECK (grupo ~ '^[A-L]$'),
  bandera_emoji TEXT DEFAULT '🏳️'
);

CREATE TABLE IF NOT EXISTS partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_no INTEGER,
  grupo CHAR(1) NOT NULL,
  equipo_local TEXT NOT NULL,
  equipo_visitante TEXT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME,
  estadio TEXT,
  ciudad TEXT,
  pais CHAR(2),
  goles_local_real INTEGER,
  goles_visitante_real INTEGER,
  cerrado BOOLEAN DEFAULT false,
  fase TEXT NOT NULL DEFAULT 'grupos' CHECK (fase IN ('grupos', 'octavos', 'cuartos', 'semifinales', 'tercero', 'final')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS predicciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  goles_local INTEGER NOT NULL DEFAULT 0,
  goles_visitante INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, partido_id)
);

CREATE TABLE IF NOT EXISTS puntos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partido_id UUID REFERENCES partidos(id) ON DELETE SET NULL,
  puntos_obtenidos INTEGER NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL CHECK (tipo IN ('exacto', 'correcto', 'tabla', 'campeon')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_users_grupo ON users(grupo_code);
CREATE INDEX IF NOT EXISTS idx_predicciones_user ON predicciones(user_id);
CREATE INDEX IF NOT EXISTS idx_predicciones_partido ON predicciones(partido_id);
CREATE INDEX IF NOT EXISTS idx_partidos_grupo ON partidos(grupo);
CREATE INDEX IF NOT EXISTS idx_partidos_fecha ON partidos(fecha);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partidos_match_no_unique ON partidos(match_no) WHERE match_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_puntos_user ON puntos(user_id);
