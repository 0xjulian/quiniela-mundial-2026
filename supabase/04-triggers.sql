-- =============================================================================
-- 04 — TRIGGERS: crear perfil en public.users al registrarse
-- Quiniela Mundial FIFA 2026
-- Ejecutar después de 03-seed.sql (necesita grupo GLOBAL y tabla users)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, username, grupo_code, telefono, aprobado, pagado, es_admin)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'Jugador'),
    'GLOBAL',
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    false,
    false,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC admin: actualizar flags aprobado/pagado de un usuario del mismo grupo
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_user_flags(
  p_user_id uuid,
  p_aprobado boolean,
  p_pagado boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  -- Verificar que el usuario actual es admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND es_admin = true
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.users
  SET aprobado = p_aprobado,
      pagado = p_pagado
  WHERE id = p_user_id
    AND grupo_code = (
      SELECT grupo_code FROM public.users WHERE id = auth.uid() LIMIT 1
    );
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RPC: devolver perfil del usuario actual (evita problemas de RLS en la app)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  SELECT * INTO rec FROM public.users WHERE id = auth.uid() LIMIT 1;
  IF rec IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN row_to_json(rec);
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC admin: listar usuarios de mi grupo (para panel admin en la app)
-- Evita recursión en políticas usando row_security = off y chequea que seas admin
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_get_group_users()
RETURNS SETOF public.users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT u.*
  FROM public.users u
  WHERE u.grupo_code = (
    SELECT grupo_code FROM public.users WHERE id = auth.uid() LIMIT 1
  )
  AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND es_admin = true
  );
$$;

-- -----------------------------------------------------------------------------
-- RPC: leaderboard del grupo del usuario actual (para pestaña Resultados)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(
  id uuid,
  username text,
  puntos_totales bigint,
  exactos bigint,
  correctos bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  WITH my_group AS (
    SELECT u.grupo_code FROM public.users u WHERE u.id = auth.uid() LIMIT 1
  ),
  group_users AS (
    SELECT u.id, u.username
    FROM public.users u
    CROSS JOIN my_group g
    WHERE u.grupo_code = g.grupo_code
      AND (u.es_admin IS NOT TRUE)
  ),
  user_puntos AS (
    SELECT p.user_id,
      COALESCE(SUM(p.puntos_obtenidos), 0)::bigint AS total,
      COUNT(*) FILTER (WHERE p.tipo = 'exacto')::bigint AS exactos,
      COUNT(*) FILTER (WHERE p.tipo = 'correcto')::bigint AS correctos
    FROM public.puntos p
    INNER JOIN group_users gu ON gu.id = p.user_id
    GROUP BY p.user_id
  )
  SELECT
    gu.id,
    gu.username,
    COALESCE(up.total, 0)::bigint,
    COALESCE(up.exactos, 0)::bigint,
    COALESCE(up.correctos, 0)::bigint
  FROM group_users gu
  LEFT JOIN user_puntos up ON up.user_id = gu.id
  ORDER BY COALESCE(up.total, 0) DESC, gu.username;
$$;

-- -----------------------------------------------------------------------------
-- RPC: calcular puntos por partido (exacto / correcto) para todos los usuarios
-- Llamar después de guardar el resultado real de un partido.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_puntos_partido(p_partido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_gl INTEGER;
  v_gv INTEGER;
  v_fase TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND es_admin = true
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT goles_local_real, goles_visitante_real, fase
  INTO v_gl, v_gv, v_fase
  FROM public.partidos
  WHERE id = p_partido_id;

  -- Siempre borrar puntos previos de ese partido (sirve también para \"quitar resultado\")
  DELETE FROM public.puntos
  WHERE partido_id = p_partido_id
    AND tipo IN ('exacto', 'correcto');

  -- Si aún no hay resultado real, solo borramos puntos y salimos
  IF v_gl IS NULL OR v_gv IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.puntos (user_id, partido_id, puntos_obtenidos, tipo)
  SELECT
    pr.user_id,
    pr.partido_id,
    CASE
      WHEN pr.goles_local = v_gl AND pr.goles_visitante = v_gv THEN 3
      WHEN (pr.goles_local - pr.goles_visitante) = (v_gl - v_gv) THEN 1
      ELSE 0
    END AS puntos,
    CASE
      WHEN pr.goles_local = v_gl AND pr.goles_visitante = v_gv THEN 'exacto'
      WHEN (pr.goles_local - pr.goles_visitante) = (v_gl - v_gv) THEN 'correcto'
      ELSE 'correcto'
    END AS tipo
  FROM public.predicciones pr
  WHERE pr.partido_id = p_partido_id;

  DELETE FROM public.puntos
  WHERE partido_id = p_partido_id
    AND puntos_obtenidos = 0;
END;
$$;

