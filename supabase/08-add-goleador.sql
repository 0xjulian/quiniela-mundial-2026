-- =============================================================================
-- 08 — Migración: columna goleador_predicho en users
-- Ejecutar solo si ya tenías la tabla users sin esta columna.
-- =============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS goleador_predicho TEXT;

