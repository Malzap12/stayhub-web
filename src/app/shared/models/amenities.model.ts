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

/** Trazos de un ícono de 24 × 24 por servicio (los códigos equivalentes comparten ícono). */
const ICON_PATHS: Record<string, string[]> = {
  WIFI: ['M2 8.8a15 15 0 0 1 20 0', 'M5 12.3a10 10 0 0 1 14 0', 'M8.5 15.8a5 5 0 0 1 7 0', 'M12 19.5h.01'],
  PARQUEADERO: ['M5 3h14v18H5z', 'M10 17V7h3.5a3 3 0 0 1 0 6H10'],
  COCINA: ['M7 2v20', 'M4 2v6a3 3 0 0 0 6 0V2', 'M17 22V2c-2 1.5-3 4.5-3 8h3'],
  PISCINA: ['M2 19c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5', 'M7 15V5a2 2 0 0 1 4 0', 'M15 15V5a2 2 0 0 1 4 0', 'M11 9h4', 'M11 13h4'],
  AIRE_ACONDICIONADO: ['M12 2v20', 'M4.9 4.9l14.2 14.2', 'M2 12h20', 'M4.9 19.1L19.1 4.9'],
  TV: ['M3 6h18v12H3z', 'M8 21h8', 'M12 18v3'],
  LAVADORA: ['M4 2h16v20H4z', 'M4 7h16', 'M8 14a4 4 0 1 0 8 0a4 4 0 1 0-8 0'],
  MASCOTAS: ['M12 13c-3 0-5.5 3.5-5.5 5.5 0 1.5 1.3 2.5 2.7 2.5h5.6c1.4 0 2.7-1 2.7-2.5 0-2-2.5-5.5-5.5-5.5z', 'M4 9.5a1.6 2 0 1 0 3.2 0a1.6 2 0 1 0-3.2 0', 'M16.8 9.5a1.6 2 0 1 0 3.2 0a1.6 2 0 1 0-3.2 0', 'M7.6 5a1.6 2 0 1 0 3.2 0a1.6 2 0 1 0-3.2 0', 'M13.2 5a1.6 2 0 1 0 3.2 0a1.6 2 0 1 0-3.2 0'],
  WORKSPACE: ['M4 5h16v10H4z', 'M2 19h20'],
  CHIMENEA: ['M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 9 0 4 3 7 7 7z'],
  HEATING: ['M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 9 0 4 3 7 7 7z'],
  GYM: ['M6 7v10', 'M18 7v10', 'M3 10v4', 'M21 10v4', 'M6 12h12'],
};
const ICON_ALIASES: Record<string, string> = {
  PARKING: 'PARQUEADERO',
  KITCHEN: 'COCINA',
  POOL: 'PISCINA',
  AC: 'AIRE_ACONDICIONADO',
  FIREPLACE: 'CHIMENEA',
};
const DEFAULT_ICON = ['M5 12.5l4.5 4.5L19 7.5'];

export function amenityIconPaths(code: string): string[] {
  const upper = code.trim().toUpperCase();
  return ICON_PATHS[ICON_ALIASES[upper] ?? upper] ?? DEFAULT_ICON;
}
