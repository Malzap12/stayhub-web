/** Reserva futura confirmada que impide desactivar la cuenta (HU-008 CA2). */
export interface UpcomingStay {
  id: string;
  code?: string;
  listingId: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  /** HUESPED: la reserva es del usuario; ANFITRION: es de un huésped en uno de sus alojamientos. */
  relation: 'HUESPED' | 'ANFITRION';
}

export interface ListingToPause {
  id: string;
  title: string;
}

/** Respuesta de GET /api/users/me/deactivation. */
export interface DeactivationCheck {
  canDeactivate: boolean;
  upcomingBookings: UpcomingStay[];
  listingsToPause: ListingToPause[];
}

/** Estado que se pasa al inicio de sesión tras desactivar la cuenta. */
export const ACCOUNT_DEACTIVATED_STATE = 'accountDeactivated';

/** Estado que se pasa a la primera pantalla tras reactivar la cuenta (HU-009). */
export const ACCOUNT_REACTIVATED_STATE = 'accountReactivated';

export const REACTIVATED_GUEST_MESSAGE = 'Tu cuenta se reactivó. ¡Qué bueno tenerte de vuelta! Tu historial sigue aquí.';
export const REACTIVATED_HOST_MESSAGE =
  'Tu cuenta se reactivó. Tus publicaciones siguen pausadas: reactiva cada una cuando quieras volver a recibir reservas.';

/** true si la navegación actual llega con el estado indicado (history.state de Angular). */
export function arrivedWith(stateKey: string): boolean {
  return Boolean((globalThis.history?.state as Record<string, unknown> | null)?.[stateKey]);
}

/** "Tienes 1 reserva futura confirmada" / "Tienes 2 reservas futuras confirmadas". */
export function upcomingStaysText(count: number): string {
  return count === 1 ? 'Tienes 1 reserva futura confirmada' : `Tienes ${count} reservas futuras confirmadas`;
}

/** Quién viaja en la reserva, desde el punto de vista del usuario. */
export function stayRelationText(stay: UpcomingStay): string {
  return stay.relation === 'HUESPED' ? 'Tu reserva' : 'Reserva de un huésped en tu alojamiento';
}

/** Enlace al detalle de la reserva según el papel del usuario en ella. */
export function stayLink(stay: UpcomingStay): string[] {
  return stay.relation === 'HUESPED' ? ['/mis-reservas', stay.id] : ['/anfitrion/reservas', stay.id];
}

/** "10 dic 2026 – 13 dic 2026" sin desfase de zona horaria. */
export function stayRangeText(stay: UpcomingStay): string {
  const format = (iso: string) =>
    new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${iso.slice(0, 10)}T00:00:00Z`),
    );
  return `${format(stay.checkIn)} – ${format(stay.checkOut)}`;
}
