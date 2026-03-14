-- =============================================================================
-- 03 — SEED: datos iniciales (solo lo necesario para login)
-- Quiniela Mundial FIFA 2026
-- Ejecutar después de 02-policies.sql
-- =============================================================================

INSERT INTO grupos (codigo, nombre) VALUES ('GLOBAL', 'Quiniela Mundial 2026')
ON CONFLICT (codigo) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Backfill: crea perfiles para usuarios que ya existían antes del trigger.
-- Ejecutar UNA vez en SQL Editor si ves "No se pudo cargar tu perfil" al entrar.
-- -----------------------------------------------------------------------------
INSERT INTO public.users (id, username, grupo_code, aprobado, pagado, es_admin)
SELECT id, COALESCE(NULLIF(TRIM(raw_user_meta_data->>'username'), ''), split_part(COALESCE(email,''), '@', 1), 'Jugador'), 'GLOBAL', false, false, false
FROM auth.users
ON CONFLICT (id) DO NOTHING;
