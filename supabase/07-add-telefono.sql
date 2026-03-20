-- =============================================================================
-- 07 — Migración: columna telefono en users
-- Ejecutar solo si ya tenías la tabla users sin esta columna.
-- =============================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS telefono TEXT;
