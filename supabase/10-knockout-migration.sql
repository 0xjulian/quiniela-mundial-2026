-- =============================================================================
-- 10 — MIGRACIÓN: fase eliminatoria (dieciseisavos + columnas knockout)
-- Quiniela Mundial FIFA 2026
-- Fuente calendario: supabase/data/Mundial_2026_FaseEliminatoria.csv (M73–M104)
--
-- Ejecutar en Supabase SQL Editor después de 01–09.
-- Si falla DROP CONSTRAINT, ejecuta el bloque DO de abajo y vuelve a correr.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Ampliar CHECK de `fase`: incluir dieciseisavos (Round of 32)
-- -----------------------------------------------------------------------------
-- Quita el CHECK antiguo aunque el nombre no sea exactamente partidos_fase_check
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'partidos'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%fase%'
  LOOP
    EXECUTE format('ALTER TABLE public.partidos DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.partidos ADD CONSTRAINT partidos_fase_check CHECK (
  fase IN (
    'grupos',
    'dieciseisavos',
    'octavos',
    'cuartos',
    'semifinales',
    'tercero',
    'final'
  )
);

-- -----------------------------------------------------------------------------
-- 2) Columnas para empates en eliminatoria (90' + quién avanza) y publicación
-- -----------------------------------------------------------------------------
ALTER TABLE public.partidos
  ADD COLUMN IF NOT EXISTS ganador_equipo TEXT,
  ADD COLUMN IF NOT EXISTS penales_local INTEGER,
  ADD COLUMN IF NOT EXISTS penales_visitante INTEGER,
  ADD COLUMN IF NOT EXISTS avanza_local_real BOOLEAN,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

COMMENT ON COLUMN public.partidos.avanza_local_real IS
  'Si el marcador de 90'' es empate, true = avanza local, false = avanza visitante (penales).';

COMMENT ON COLUMN public.partidos.ganador_equipo IS
  'Opcional: nombre del equipo que avanza (útil para validación / UI).';

ALTER TABLE public.predicciones
  ADD COLUMN IF NOT EXISTS avanza_local_pred BOOLEAN;

COMMENT ON COLUMN public.predicciones.avanza_local_pred IS
  'Predicción: si el usuario predice empate en 90'', quién avanza (true=local).';
