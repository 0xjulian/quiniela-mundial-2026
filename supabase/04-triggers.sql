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
  INSERT INTO public.users (id, username, grupo_code, aprobado, pagado, es_admin)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'Jugador'),
    'GLOBAL',
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
