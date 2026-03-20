-- =============================================================================
-- 12 — LIGAS PRIVADAS (grupos con amigos)
-- Misma quiniela / mismos puntos; ranking filtrado por miembros de la liga.
-- Ejecutar después de 04-triggers.sql (necesita public.users).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.private_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT private_leagues_name_len CHECK (
    char_length(trim(name)) >= 1 AND char_length(name) <= 100
  )
);

CREATE TABLE IF NOT EXISTS public.private_league_members (
  league_id UUID NOT NULL REFERENCES public.private_leagues (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (league_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_private_league_members_user
  ON public.private_league_members (user_id);

CREATE INDEX IF NOT EXISTS idx_private_leagues_invite
  ON public.private_leagues (invite_code);

COMMENT ON TABLE public.private_leagues IS 'Mini-quinielas con amigos; mismo marcador global, ranking por miembros.';
COMMENT ON TABLE public.private_league_members IS 'Membresía usuario ↔ liga privada.';

-- -----------------------------------------------------------------------------
-- RLS: solo lectura para miembros; altas vía RPC (SECURITY DEFINER)
-- -----------------------------------------------------------------------------
ALTER TABLE public.private_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_league_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "private_leagues_select_members" ON public.private_leagues;
CREATE POLICY "private_leagues_select_members" ON public.private_leagues
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.private_league_members m
      WHERE m.league_id = private_leagues.id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "private_league_members_select_peers" ON public.private_league_members;
CREATE POLICY "private_league_members_select_peers" ON public.private_league_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.private_league_members m2
      WHERE m2.league_id = private_league_members.league_id
        AND m2.user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Crear liga (creador entra como miembro)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_private_league(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_id uuid;
  v_code text;
  n text;
  i int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.aprobado = true AND u.pagado = true
  ) THEN
    RAISE EXCEPTION 'Debes estar aprobado y con acceso activo para crear una liga';
  END IF;

  n := trim(p_name);
  IF n IS NULL OR length(n) < 1 OR length(n) > 100 THEN
    RAISE EXCEPTION 'Nombre inválido (1–100 caracteres)';
  END IF;

  LOOP
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.private_leagues pl WHERE pl.invite_code = v_code);
    i := i + 1;
    IF i > 20 THEN
      RAISE EXCEPTION 'No se pudo generar código único';
    END IF;
  END LOOP;

  INSERT INTO public.private_leagues (invite_code, name, created_by)
  VALUES (v_code, n, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.private_league_members (league_id, user_id)
  VALUES (v_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'id', v_id,
    'invite_code', v_code,
    'name', n
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Unirse por código
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_private_league(p_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_league_id uuid;
  v_name text;
  v_code text;
  v_stored_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.aprobado = true AND u.pagado = true
  ) THEN
    RAISE EXCEPTION 'Debes estar aprobado y con acceso activo para unirte';
  END IF;

  v_code := upper(trim(p_invite_code));
  IF v_code IS NULL OR length(v_code) < 4 THEN
    RAISE EXCEPTION 'Código inválido';
  END IF;

  SELECT pl.id, pl.name, pl.invite_code INTO v_league_id, v_name, v_stored_code
  FROM public.private_leagues pl
  WHERE upper(trim(pl.invite_code)) = v_code
  LIMIT 1;

  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'No existe una liga con ese código';
  END IF;

  INSERT INTO public.private_league_members (league_id, user_id)
  VALUES (v_league_id, auth.uid())
  ON CONFLICT (league_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'id', v_league_id,
    'name', v_name,
    'invite_code', v_stored_code
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Mis ligas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_private_leagues()
RETURNS TABLE (
  id uuid,
  name text,
  invite_code text,
  member_count bigint,
  is_creator boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    pl.id,
    pl.name,
    pl.invite_code,
    (SELECT count(*)::bigint FROM public.private_league_members m WHERE m.league_id = pl.id),
    (pl.created_by = auth.uid())
  FROM public.private_leagues pl
  INNER JOIN public.private_league_members mem ON mem.league_id = pl.id AND mem.user_id = auth.uid()
  ORDER BY pl.created_at DESC;
$$;

-- -----------------------------------------------------------------------------
-- Leaderboard dentro de una liga (mismos puntos que la general)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_leaderboard_league(p_league_id uuid)
RETURNS TABLE(
  id uuid,
  username text,
  puntos_totales bigint,
  exactos bigint,
  correctos bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.private_league_members mx
    WHERE mx.league_id = p_league_id AND mx.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No perteneces a esta liga';
  END IF;

  RETURN QUERY
  WITH mem_users AS (
    SELECT u.id, u.username
    FROM public.private_league_members m
    INNER JOIN public.users u ON u.id = m.user_id
    WHERE m.league_id = p_league_id
      AND (u.es_admin IS NOT TRUE)
  ),
  user_puntos AS (
    SELECT p.user_id,
      COALESCE(SUM(p.puntos_obtenidos), 0)::bigint AS total,
      COUNT(*) FILTER (WHERE p.tipo = 'exacto')::bigint AS exactos,
      COUNT(*) FILTER (WHERE p.tipo = 'correcto')::bigint AS correctos
    FROM public.puntos p
    INNER JOIN mem_users gu ON gu.id = p.user_id
    GROUP BY p.user_id
  )
  SELECT
    gu.id,
    gu.username,
    COALESCE(up.total, 0)::bigint,
    COALESCE(up.exactos, 0)::bigint,
    COALESCE(up.correctos, 0)::bigint
  FROM mem_users gu
  LEFT JOIN user_puntos up ON up.user_id = gu.id
  ORDER BY COALESCE(up.total, 0) DESC, gu.username;
END;
$$;

REVOKE ALL ON FUNCTION public.create_private_league(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_private_league(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_private_leagues() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard_league(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_private_league(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_private_league(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_private_leagues() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_league(uuid) TO authenticated;
