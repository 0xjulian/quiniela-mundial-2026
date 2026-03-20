-- =============================================================================
-- 02 — RLS Y POLÍTICAS
-- Quiniela Mundial FIFA 2026
-- Ejecutar después de 01-schema.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Activar RLS en todas las tablas
-- -----------------------------------------------------------------------------

ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE predicciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE puntos ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- grupos
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Usuarios ven su grupo" ON grupos;
CREATE POLICY "Usuarios ven su grupo" ON grupos FOR SELECT
  USING (codigo IN (SELECT grupo_code FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Autenticados ven grupo GLOBAL" ON grupos;
CREATE POLICY "Autenticados ven grupo GLOBAL" ON grupos FOR SELECT
  TO authenticated USING (codigo = 'GLOBAL');

DROP POLICY IF EXISTS "Admin gestiona su grupo" ON grupos;
CREATE POLICY "Admin gestiona su grupo" ON grupos FOR ALL
  USING ((SELECT es_admin FROM users WHERE id = auth.uid()) = true);

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Usuario ve su propio perfil" ON users;
CREATE POLICY "Usuario ve su propio perfil" ON users FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Usuarios ven perfiles de su grupo" ON users;
CREATE POLICY "Usuarios ven perfiles de su grupo" ON users FOR SELECT
  USING (grupo_code IN (SELECT grupo_code FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Usuario actualiza su perfil" ON users;
CREATE POLICY "Usuario actualiza su perfil" ON users FOR UPDATE
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Usuario inserta su perfil al registrarse" ON users;
CREATE POLICY "Usuario inserta su perfil al registrarse" ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- partidos
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Todos autenticados ven partidos" ON partidos;
CREATE POLICY "Todos autenticados ven partidos" ON partidos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin actualiza partidos" ON partidos;
CREATE POLICY "Admin actualiza partidos" ON partidos FOR UPDATE
  USING ((SELECT es_admin FROM users WHERE id = auth.uid()) = true);

-- -----------------------------------------------------------------------------
-- predicciones
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Usuario ve y crea sus predicciones" ON predicciones;
CREATE POLICY "Usuario ve y crea sus predicciones" ON predicciones FOR ALL
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- puntos
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Usuario ve sus puntos" ON puntos;
CREATE POLICY "Usuario ve sus puntos" ON puntos FOR SELECT
  USING (user_id = auth.uid());
