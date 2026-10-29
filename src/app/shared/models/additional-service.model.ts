/** Servicio adicional opcional que el anfitrión ofrece con costo por estancia. */
export interface AdditionalService {
  id?: string;
  name: string;
  cost: number;
}

export const MAX_ADDITIONAL_SERVICES = 10;
export const MAX_ADDITIONAL_SERVICE_COST = 10_000_000;

export interface AdditionalServiceErrors {
  name?: string;
  cost?: string;
}

/** Nombre sin espacios sobrantes: "  Desayuno   para dos " -> "Desayuno para dos". */
export function cleanServiceName(name: string): string {
  return String(name ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * Valida en el navegador las mismas reglas del servidor: nombre de 3 a 80 caracteres que no se repita en la
 * publicación y costo por estancia mayor que 0 COP. `ownId` excluye al servicio que se está editando.
 */
export function validateAdditionalService(
  name: string,
  cost: number | null,
  existing: AdditionalService[],
  ownId?: string,
): AdditionalServiceErrors {
  const errors: AdditionalServiceErrors = {};
  const clean = cleanServiceName(name);
  if (clean.length < 3 || clean.length > 80) {
    errors.name = 'Escribe un nombre de 3 a 80 caracteres.';
  } else if (existing.some((item) => item.id !== ownId && item.name.toLowerCase() === clean.toLowerCase())) {
    errors.name = 'Ya ofreces un servicio con ese nombre.';
  }
  if (cost === null || !Number.isFinite(cost) || cost <= 0) {
    errors.cost = 'El costo debe ser mayor que 0 COP.';
  } else if (cost > MAX_ADDITIONAL_SERVICE_COST) {
    errors.cost = 'El costo no puede superar 10.000.000 COP.';
  }
  return errors;
}
