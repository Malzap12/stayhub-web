/** Nombre de cada servicio, tanto los del formulario del anfitrión como los de las publicaciones demo. */
export const AMENITY_LABELS: Record<string, string> = {
  WIFI: 'Wi-Fi',
  COCINA: 'Cocina',
  KITCHEN: 'Cocina',
  PARQUEADERO: 'Parqueadero',
  PARKING: 'Parqueadero',
  PISCINA: 'Piscina',
  POOL: 'Piscina',
  AIRE_ACONDICIONADO: 'Aire acondicionado',
  AC: 'Aire acondicionado',
  TV: 'TV',
  LAVADORA: 'Lavadora',
  MASCOTAS: 'Admite mascotas',
  WORKSPACE: 'Espacio de trabajo',
  HEATING: 'Calefacción',
  GYM: 'Gimnasio',
  FIREPLACE: 'Chimenea',
  CHIMENEA: 'Chimenea',
};

export function amenityLabel(code: string): string {
  if (AMENITY_LABELS[code]) {
    return AMENITY_LABELS[code];
  }
  const text = code.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * HU-025 · Servicios por los que se puede filtrar la búsqueda: los del formulario del anfitrión. El API trata como
 * iguales los códigos equivalentes (PARKING = PARQUEADERO, KITCHEN = COCINA, POOL = PISCINA, AC = AIRE_ACONDICIONADO).
 */
export const AMENITY_FILTERS: Array<{ value: string; label: string }> = [
  'WIFI', 'PARQUEADERO', 'COCINA', 'PISCINA', 'AIRE_ACONDICIONADO', 'TV', 'LAVADORA', 'MASCOTAS',
].map((value) => ({ value, label: AMENITY_LABELS[value] }));
