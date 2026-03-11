export interface User {
  id: string;
  username: string;
  grupo_code: string;
  aprobado: boolean;
  pagado: boolean;
  es_admin: boolean;
  campeon_predicho: string | null;
  created_at?: string;
}

export interface Grupo {
  id: string;
  codigo: string;
  nombre: string;
  admin_id: string | null;
  distribucion_premios?: { 1?: number; 2?: number; 3?: number };
}

export interface Partido {
  id: string;
  grupo: string;
  equipo_local: string;
  equipo_visitante: string;
  fecha: string;
  hora: string | null;
  ciudad: string | null;
  goles_local_real: number | null;
  goles_visitante_real: number | null;
  cerrado: boolean;
  fase: string;
}

export interface Prediccion {
  id: string;
  user_id: string;
  partido_id: string;
  goles_local: number;
  goles_visitante: number;
}

export interface PuntosRow {
  id: string;
  user_id: string;
  partido_id: string | null;
  puntos_obtenidos: number;
  tipo: 'exacto' | 'correcto' | 'tabla' | 'campeon';
}
