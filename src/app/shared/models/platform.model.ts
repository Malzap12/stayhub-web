/**
 * HU-029 · Configuración de la tarifa de servicio de la plataforma (RF-040, RN-014).
 */
export interface ServiceFeeConfig {
  serviceFeePercent: number;
  percentage: number;
  updatedAt?: string;
  updatedBy?: string;
}

export const MIN_SERVICE_FEE = 0;
export const MAX_SERVICE_FEE = 30;

export function validateServiceFeeInput(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'El porcentaje de la tarifa de servicio debe ser un número.';
  }
  if (value < MIN_SERVICE_FEE || value > MAX_SERVICE_FEE) {
    return 'El porcentaje de la tarifa de servicio debe estar entre 0 % y 30 %.';
  }
  return null;
}
