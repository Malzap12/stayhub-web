import { STATUS_TEXT, statusText } from './display.model';

/** Evento de la bitácora de auditoría, tal como lo entrega GET /api/audit/events. */
export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId?: string;
  occurredAt: string;
  result: 'EXITOSO' | 'FALLIDO';
  detail?: string;
}

/** Página de eventos, del más reciente al más antiguo. */
export interface AuditEventsPage {
  data: AuditEvent[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditFilters {
  from: string;
  to: string;
  actor: string;
  action: string;
  entity: string;
  result: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = { from: '', to: '', actor: '', action: '', entity: '', result: '' };

export const AUDIT_PAGE_SIZES = [20, 50, 100];

/** Nombre legible de cada tipo de evento. */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
  REGISTER: 'Registro de cuenta',
  PASSWORD_RECOVERY_REQUEST: 'Solicitud de recuperación de contraseña',
  PASSWORD_RESET: 'Restablecimiento de contraseña',
  PASSWORD_CHANGE: 'Cambio de contraseña',
  ACCOUNT_DEACTIVATION: 'Desactivación de cuenta',
  ACCOUNT_REACTIVATION: 'Reactivación de cuenta',
  PROFILE_UPDATE: 'Actualización del perfil',
  ACCESS_DENIED: 'Acceso denegado',
  LISTING_STATUS_CHANGE: 'Cambio de estado de una publicación',
  LISTING_PRICING_UPDATE: 'Cambio de tarifas',
  AVAILABILITY_PERIOD_CREATE: 'Registro de disponibilidad',
  RESERVED_PERIOD_BLOCK: 'Bloqueo de fechas',
  BOOKING_STATUS_CHANGE: 'Cambio de estado de una reserva',
  BOOKING_CANCELLATION: 'Cancelación de una reserva',
  REVIEW_CREATED: 'Reseña publicada',
  ADMIN_ACTION: 'Acción administrativa',
  SERVICE_FEE_UPDATE: 'Cambio de la tarifa de servicio',
  EXPORT: 'Exportación de un reporte',
  AUDIT_TAMPER_ATTEMPT: 'Intento de modificar la auditoría',
};

/** Nombre legible de cada entidad afectada. */
export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  AuthSession: 'Sesión',
  UserAccount: 'Cuenta de usuario',
  Listing: 'Publicación',
  Booking: 'Reserva',
  PlatformConfig: 'Configuración',
  Report: 'Reporte',
  AuditEvent: 'Auditoría',
  Generic: 'General',
};

export const AUDIT_RESULT_LABELS: Record<string, string> = { EXITOSO: 'Exitoso', FALLIDO: 'Fallido' };

const LISTING_STATUS_TEXT: Record<string, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_REVISION: 'En revisión',
  ACTIVA: 'Activa',
  PAUSADA: 'Pausada',
  BLOQUEADA: 'Bloqueada',
  RESTRINGIDA: 'Restringida',
  DESACTIVADA: 'Desactivada',
};

export const auditActionLabel = (action: string): string => AUDIT_ACTION_LABELS[action] ?? statusText(action);
export const auditEntityLabel = (entity: string): string => AUDIT_ENTITY_LABELS[entity] ?? entity;
export const auditResultLabel = (result: string): string => AUDIT_RESULT_LABELS[result] ?? statusText(result);

/** Referencias internas de requisitos que no deben verse en pantalla: "(RN-014)", "HU-050", "CA2". */
const INTERNAL_REFERENCE = /\s*\((?:\s*(?:HU|RF|RNF|RN|CA|TA|EP)-?\d+[^)]*)\)|\b(?:HU|RF|RNF|RN|TA|EP)-\d+\b/g;

/**
 * Detalle del evento listo para mostrar: sin referencias internas y con los estados por su nombre.
 * "PENDIENTE_REVISION -> ACTIVA" -> "En revisión → Activa".
 */
export function auditDetailText(detail?: string): string {
  return (detail ?? '')
    .replace(INTERNAL_REFERENCE, '')
    .replace(/\b[A-Z]+(?:_[A-Z]+)*\b/g, (code) => LISTING_STATUS_TEXT[code] ?? (STATUS_TEXT[code] ? statusText(code) : code))
    .replace(/\s*->\s*/g, ' → ')
    .trim();
}

/** Parámetros de GET /api/audit/events con los filtros llenos, la página y su tamaño. */
export function auditQuery(filters: AuditFilters, page: number, limit: number): string {
  const params = new URLSearchParams();
  (Object.keys(EMPTY_AUDIT_FILTERS) as Array<keyof AuditFilters>).forEach((key) => {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  });
  params.set('page', String(page));
  params.set('limit', String(limit));
  return params.toString();
}
