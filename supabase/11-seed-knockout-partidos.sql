-- =============================================================================
-- 11 — SEED: partidos eliminatorios M73–M104
-- Quiniela Mundial FIFA 2026
-- Horario CT (columna CT del CSV). Fechas año 2026.
--
-- Idempotente: borra M73–M104 y reinserta (cuidado: borra predicciones de esos partidos).
-- Ejecutar después de 10-knockout-migration.sql
-- =============================================================================

DELETE FROM public.partidos
WHERE match_no IS NOT NULL
  AND match_no BETWEEN 73 AND 104;

-- grupo: placeholder 'A' (A–L permitido por schema); la UI filtra por `fase`.
INSERT INTO public.partidos (
  match_no, grupo, equipo_local, equipo_visitante,
  fecha, hora, estadio, ciudad, pais, fase
) VALUES
-- Dieciseisavos (M73–M88)
(73, 'A', '2° Grupo A', '2° Grupo B', '2026-06-28', '13:00', 'SoFi Stadium', 'Los Ángeles', 'US', 'dieciseisavos'),
(76, 'A', '1° Grupo C', '2° Grupo F', '2026-06-29', '11:00', 'NRG Stadium', 'Houston', 'US', 'dieciseisavos'),
(74, 'A', '1° Grupo E', '3° A/B/C/D/F', '2026-06-29', '14:30', 'Gillette Stadium', 'Boston', 'US', 'dieciseisavos'),
(75, 'A', '1° Grupo F', '2° Grupo C', '2026-06-29', '19:00', 'Estadio BBVA', 'Monterrey', 'MX', 'dieciseisavos'),
(78, 'A', '2° Grupo E', '2° Grupo I', '2026-06-30', '11:00', 'AT&T Stadium', 'Dallas', 'US', 'dieciseisavos'),
(77, 'A', '1° Grupo I', '3° C/D/F/G/H', '2026-06-30', '15:00', 'MetLife Stadium', 'Nueva York/NJ', 'US', 'dieciseisavos'),
(79, 'A', '1° Grupo A', '3° C/E/F/H/I', '2026-06-30', '19:00', 'Estadio Azteca', 'Ciudad de México', 'MX', 'dieciseisavos'),
(80, 'A', '1° Grupo L', '3° E/H/I/J/K', '2026-07-01', '10:00', 'Mercedes-Benz Stadium', 'Atlanta', 'US', 'dieciseisavos'),
(82, 'A', '1° Grupo G', '3° A/E/H/I/J', '2026-07-01', '14:00', 'Lumen Field', 'Seattle', 'US', 'dieciseisavos'),
(81, 'A', '1° Grupo D', '3° B/E/F/I/J', '2026-07-01', '18:00', 'Levi''s Stadium', 'San Francisco', 'US', 'dieciseisavos'),
(84, 'A', '1° Grupo H', '2° Grupo J', '2026-07-02', '13:00', 'SoFi Stadium', 'Los Ángeles', 'US', 'dieciseisavos'),
(83, 'A', '2° Grupo K', '2° Grupo L', '2026-07-02', '17:00', 'BMO Field', 'Toronto', 'CA', 'dieciseisavos'),
(85, 'A', '1° Grupo B', '3° E/F/G/I/J', '2026-07-02', '21:00', 'BC Place', 'Vancouver', 'CA', 'dieciseisavos'),
(88, 'A', '2° Grupo D', '2° Grupo G', '2026-07-03', '12:00', 'AT&T Stadium', 'Dallas', 'US', 'dieciseisavos'),
(86, 'A', '1° Grupo J', '2° Grupo H', '2026-07-03', '16:00', 'Hard Rock Stadium', 'Miami', 'US', 'dieciseisavos'),
(87, 'A', '1° Grupo K', '3° D/E/I/J/L', '2026-07-03', '19:30', 'Arrowhead Stadium', 'Kansas City', 'US', 'dieciseisavos'),
-- Octavos (M89–M96)
(90, 'A', 'W(M73)', 'W(M75)', '2026-07-04', '11:00', 'NRG Stadium', 'Houston', 'US', 'octavos'),
(89, 'A', 'W(M74)', 'W(M77)', '2026-07-04', '15:00', 'Lincoln Financial Field', 'Filadelfia', 'US', 'octavos'),
(91, 'A', 'W(M76)', 'W(M78)', '2026-07-05', '14:00', 'MetLife Stadium', 'Nueva York/NJ', 'US', 'octavos'),
(92, 'A', 'W(M79)', 'W(M80)', '2026-07-05', '18:00', 'Estadio Azteca', 'Ciudad de México', 'MX', 'octavos'),
(93, 'A', 'W(M83)', 'W(M84)', '2026-07-06', '13:00', 'AT&T Stadium', 'Dallas', 'US', 'octavos'),
(94, 'A', 'W(M81)', 'W(M82)', '2026-07-06', '18:00', 'Lumen Field', 'Seattle', 'US', 'octavos'),
(95, 'A', 'W(M86)', 'W(M88)', '2026-07-07', '10:00', 'Mercedes-Benz Stadium', 'Atlanta', 'US', 'octavos'),
(96, 'A', 'W(M85)', 'W(M87)', '2026-07-07', '14:00', 'BC Place', 'Vancouver', 'CA', 'octavos'),
-- Cuartos (M97–M100)
(97, 'A', 'W(M89)', 'W(M90)', '2026-07-09', '14:00', 'Gillette Stadium', 'Boston', 'US', 'cuartos'),
(98, 'A', 'W(M93)', 'W(M94)', '2026-07-10', '13:00', 'SoFi Stadium', 'Los Ángeles', 'US', 'cuartos'),
(99, 'A', 'W(M91)', 'W(M92)', '2026-07-11', '15:00', 'Hard Rock Stadium', 'Miami', 'US', 'cuartos'),
(100, 'A', 'W(M95)', 'W(M96)', '2026-07-11', '19:00', 'Arrowhead Stadium', 'Kansas City', 'US', 'cuartos'),
-- Semifinales
(101, 'A', 'W(M97)', 'W(M98)', '2026-07-14', '13:00', 'AT&T Stadium', 'Dallas', 'US', 'semifinales'),
(102, 'A', 'W(M99)', 'W(M100)', '2026-07-15', '13:00', 'Mercedes-Benz Stadium', 'Atlanta', 'US', 'semifinales'),
-- 3er lugar + Final
(103, 'A', 'Perd. M101', 'Perd. M102', '2026-07-18', '15:00', 'Hard Rock Stadium', 'Miami', 'US', 'tercero'),
(104, 'A', 'Gan. M101', 'Gan. M102', '2026-07-19', '13:00', 'MetLife Stadium', 'Nueva York/NJ', 'US', 'final');
