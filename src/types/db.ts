export interface User {
  id: string;
  username: string;
  grupo_code: string;
  telefono: string | null;
  aprobado: boolean;
  pagado: boolean;
  es_admin: boolean;
  campeon_predicho: string | null;
  goleador_predicho: string | null;
  created_at?: string;
}

export interface Grupo {
  id: string;
  codigo: string;
  nombre: string;
  admin_id: string | null;
  distribucion_premios?: { 1?: number; 2?: number; 3?: number };
  campeon_real?: string | null;
  goleador_real?: string | null;
}

export interface Partido {
  id: string;
  match_no: number | null;
  grupo: string;
  equipo_local: string;
  equipo_visitante: string;
  fecha: string;
  hora: string | null;
  estadio: string | null;
  ciudad: string | null;
  pais: string | null;
  goles_local_real: number | null;
  goles_visitante_real: number | null;
  cerrado: boolean;
  /** grupos | dieciseisavos | octavos | cuartos | semifinales | tercero | final */
  fase: string;
  ganador_equipo?: string | null;
  penales_local?: number | null;
  penales_visitante?: number | null;
  avanza_local_real?: boolean | null;
  published_at?: string | null;
}

export interface Prediccion {
  id: string;
  user_id: string;
  partido_id: string;
  goles_local: number;
  goles_visitante: number;
  /** Si predice empate en 90', quién avanza (true = local) */
  avanza_local_pred?: boolean | null;
}

export interface PuntosRow {
  id: string;
  user_id: string;
  partido_id: string | null;
  puntos_obtenidos: number;
  tipo: 'exacto' | 'correcto' | 'tabla' | 'campeon';
}
