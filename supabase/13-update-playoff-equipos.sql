-- =============================================================================
-- 13 — MIGRACIÓN: repechajes resueltos → nombres definitivos en `partidos`
-- Ejecutar UNA vez en SQL Editor si la BD aún tiene placeholders (PO UEFA / PO IC).
-- Idempotente: segunda ejecución no cambia filas si ya están actualizadas.
-- =============================================================================

UPDATE public.partidos SET equipo_local = 'República Checa' WHERE equipo_local = 'PO UEFA D';
UPDATE public.partidos SET equipo_visitante = 'República Checa' WHERE equipo_visitante = 'PO UEFA D';

UPDATE public.partidos SET equipo_local = 'Bosnia y Herzegovina' WHERE equipo_local = 'PO UEFA A';
UPDATE public.partidos SET equipo_visitante = 'Bosnia y Herzegovina' WHERE equipo_visitante = 'PO UEFA A';

UPDATE public.partidos SET equipo_local = 'Turquía' WHERE equipo_local = 'PO UEFA C';
UPDATE public.partidos SET equipo_visitante = 'Turquía' WHERE equipo_visitante = 'PO UEFA C';

UPDATE public.partidos SET equipo_local = 'Suecia' WHERE equipo_local = 'PO UEFA B';
UPDATE public.partidos SET equipo_visitante = 'Suecia' WHERE equipo_visitante = 'PO UEFA B';

UPDATE public.partidos SET equipo_local = 'Irak' WHERE equipo_local = 'PO IC 2';
UPDATE public.partidos SET equipo_visitante = 'Irak' WHERE equipo_visitante = 'PO IC 2';

UPDATE public.partidos SET equipo_local = 'República Democrática del Congo' WHERE equipo_local = 'PO IC 1';
UPDATE public.partidos SET equipo_visitante = 'República Democrática del Congo' WHERE equipo_visitante = 'PO IC 1';

-- Grupo G = Nueva Zelanda (no Suecia). Corrige si una versión anterior sustituyó NZ por Suecia en G.
UPDATE public.partidos SET equipo_local = 'Nueva Zelanda'
WHERE fase = 'grupos' AND grupo = 'G' AND equipo_local = 'Suecia';
UPDATE public.partidos SET equipo_visitante = 'Nueva Zelanda'
WHERE fase = 'grupos' AND grupo = 'G' AND equipo_visitante = 'Suecia';

UPDATE public.partidos SET ganador_equipo = 'República Checa' WHERE ganador_equipo = 'PO UEFA D';
UPDATE public.partidos SET ganador_equipo = 'Bosnia y Herzegovina' WHERE ganador_equipo = 'PO UEFA A';
UPDATE public.partidos SET ganador_equipo = 'Turquía' WHERE ganador_equipo = 'PO UEFA C';
UPDATE public.partidos SET ganador_equipo = 'Suecia' WHERE ganador_equipo = 'PO UEFA B';
UPDATE public.partidos SET ganador_equipo = 'Irak' WHERE ganador_equipo = 'PO IC 2';
UPDATE public.partidos SET ganador_equipo = 'República Democrática del Congo' WHERE ganador_equipo = 'PO IC 1';
