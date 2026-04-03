# Supabase — Quiniela Mundial 2026

Cada archivo SQL tiene **una sola función**. Ejecutar en el SQL Editor **en este orden**.

| Orden | Archivo | Función |
|-------|---------|---------|
| 1 | **01-schema.sql** | Tablas e índices. Nada de RLS ni datos. |
| 2 | **02-policies.sql** | Activa RLS y define todas las políticas. |
| 3 | **03-seed.sql** | Inserta el grupo GLOBAL (necesario para login). |
| 4 | **04-triggers.sql** | Trigger que crea el perfil en `public.users` al registrarse. |
| 5 | **05-seed-partidos.sql** | *(Opcional)* Partidos de fase de grupos. |
| 6 | **06-migrate-partidos-fields.sql** | *(Migración)* `match_no`, `estadio`, `pais` si faltan. |
| 7 | **07-add-telefono.sql** | *(Migración)* Añade columna `telefono` a `users` si ya tenías la tabla. |
| 8 | **08-add-goleador.sql** | *(Migración)* `goleador_predicho` en `users`. |
| 9 | **09-add-campeon-goleador-real.sql** | *(Migración)* `campeon_real` / `goleador_real` en `grupos`. |
| 10 | **10-knockout-migration.sql** | *(Migración)* Fase `dieciseisavos` + columnas eliminatoria (`ganador_equipo`, penales, `published_at`, etc.). |
| 11 | **11-seed-knockout-partidos.sql** | *(Opcional)* Calendario eliminatorio **M73–M104** (ver `data/Mundial_2026_FaseEliminatoria.csv`). |
| 12 | **12-private-leagues.sql** | *(Migración)* Ligas con amigos: tablas `private_leagues` / `private_league_members`, RLS y RPCs (`create_private_league`, `join_private_league`, `my_private_leagues`, `get_leaderboard_league`). |
| 13 | **13-update-playoff-equipos.sql** | *(Migración)* Sustituye placeholders de repechaje por equipos definitivos (República Checa, Bosnia, Turquía, Suecia en F, Irak, RD Congo; G queda Nueva Zelanda) en `partidos`. |

---

## Fase eliminatoria (M73–M104)

1. Ejecuta **10-knockout-migration.sql** (amplía el `CHECK` de `fase` y añade columnas).
2. Ejecuta **11-seed-knockout-partidos.sql** (inserta los 32 partidos; **borra** cualquier fila previa con `match_no` 73–104).

**Mapeo de rondas (CSV → `partidos.fase`):** `Dieciseisavos` → `dieciseisavos`, `Octavos` → `octavos`, `Cuartos` → `cuartos`, `SEMIFINAL` → `semifinales`, `3er LUGAR` → `tercero`, final → `final`.

### Limpieza opcional: partidos de grupos duplicados (`match_no` NULL)

Si ves **216** filas en grupos y solo **72** deberían existir, puedes borrar las filas huérfanas **solo si no te importa perder predicciones ligadas a esos IDs**:

```sql
DELETE FROM public.partidos
WHERE fase = 'grupos' AND match_no IS NULL;
```

---

## Proyecto nuevo

Ejecuta **01 → 02 → 03 → 04** (y 05 si quieres partidos de ejemplo). Solo una vez.

## Ya tienes tablas y solo quieres el trigger o políticas

- Solo trigger: ejecuta **04-triggers.sql**.
- Solo políticas: ejecuta **02-policies.sql** (usa `DROP POLICY IF EXISTS` para poder re-ejecutar).
- Solo grupo GLOBAL: ejecuta **03-seed.sql** (`ON CONFLICT DO NOTHING`).

## Usuarios que existían antes del trigger

Ejecuta una vez el bloque comentado al final de **03-seed.sql** (backfill de `public.users` desde `auth.users`).

---

**init.sql** solo documenta el orden; no lo ejecutes como script.
