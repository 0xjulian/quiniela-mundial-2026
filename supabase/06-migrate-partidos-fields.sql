-- =============================================================================
-- 06 — MIGRACIÓN: campos extra para partidos (match_no, estadio, pais)
-- Quiniela Mundial FIFA 2026
-- Ejecutar si ya tienes la tabla `partidos` creada sin estas columnas.
-- =============================================================================

ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS match_no INTEGER;

ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS estadio TEXT;

ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS pais CHAR(2);

-- match_no único (para tener M1..M72 sin duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_partidos_match_no_unique
  ON partidos(match_no)
  WHERE match_no IS NOT NULL;

