/** Reserva recibida tal como la devuelve GET /api/bookings/host (HU-035 CA1). */
export interface HostBookingSummary {
  id: string;
  code?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  guestName: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
}

/** Reservas recibidas agrupadas por alojamiento (HU-035 CA1). */
export interface HostListingBookings {
  listingId: string;
  listingTitle: string;
  listingCity: string;
  listingImage?: string;
  bookings: HostBookingSummary[];
}

/** Contacto del huésped: el API solo lo envía con la reserva confirmada (HU-035 CA2). */
export interface GuestContact {
  name: string;
  email: string;
  phone?: string;
}

/** Detalle de GET /api/bookings/host/:id (HU-035 CA2). */
export interface HostBookingDetail extends HostBookingSummary {
  listingId: string;
  listingTitle: string;
  listingCity: string;
  specialRequests?: string;
  additionalServices?: { name: string; cost: number }[];
  guestContact?: GuestContact;
}

export const HOST_BOOKING_FILTERS: { value: string; label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'CONFIRMADA', label: 'Confirmadas' },
  { value: 'PENDIENTE', label: 'Pendientes de pago' },
  { value: 'EN_REVISION', label: 'En revisión' },
  { value: 'COMPLETADA', label: 'Completadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
];

/** Qué significa cada estado para el anfitrión. */
export const HOST_STATUS_NOTES: Record<string, string> = {
  PENDIENTE: 'El huésped aún no ha pagado. Las fechas se bloquean cuando la reserva se confirma.',
  CONFIRMADA: 'La reserva está pagada. Prepara la llegada del huésped.',
  CANCELADA: 'La reserva se canceló y las fechas volvieron a estar disponibles.',
  COMPLETADA: 'La estancia ya terminó.',
  EN_REVISION: 'El administrador está revisando esta reserva; te avisaremos cuando la resuelva.',
};

export function hostStatusNote(status: string): string {
  return HOST_STATUS_NOTES[status] ?? '';
}

/** "2 huéspedes" / "1 huésped". */
export function guestsText(count: number): string {
  return `${count} ${count === 1 ? 'huésped' : 'huéspedes'}`;
}

/** "2 noches" / "1 noche". */
export function nightsText(count: number): string {
  return `${count} ${count === 1 ? 'noche' : 'noches'}`;
}

/** Fecha de llegada o salida sin desfase de zona horaria: "sáb, 10 de abril de 2027". */
export function formatStayDate(iso: string, withWeekday = true): string {
  return new Intl.DateTimeFormat('es-CO', {
    ...(withWeekday ? { weekday: 'short' as const } : {}),
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}

/** Enlace tel: con solo dígitos y el signo +. */
export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Total de reservas en todos los alojamientos. */
export function countHostBookings(groups: HostListingBookings[]): number {
  return groups.reduce((sum, group) => sum + group.bookings.length, 0);
}
