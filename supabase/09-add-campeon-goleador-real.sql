-- Añade columnas para campeón y goleador reales del torneo al grupo

ALTER TABLE public.grupos
ADD COLUMN IF NOT EXISTS campeon_real TEXT;

ALTER TABLE public.grupos
ADD COLUMN IF NOT EXISTS goleador_real TEXT;

