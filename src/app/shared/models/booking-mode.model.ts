/** HU-018 · Modalidad de reserva de una publicación. */
export type BookingMode = 'INMEDIATA' | 'CON_APROBACION';

/** CA1: toda publicación nueva acepta reservas inmediatas. */
export const DEFAULT_BOOKING_MODE: BookingMode = 'INMEDIATA';

export interface BookingModeOption {
  value: BookingMode;
  label: string;
  hostDescription: string;
  guestDescription: string;
}

export const BOOKING_MODE_OPTIONS: BookingModeOption[] = [
  {
    value: 'INMEDIATA',
    label: 'Reserva inmediata',
    hostDescription: 'El huésped reserva y paga al momento, sin esperar tu respuesta.',
    guestDescription: 'Se confirma en cuanto pagas, sin esperar respuesta del anfitrión.',
  },
  {
    value: 'CON_APROBACION',
    label: 'Con aprobación',
    hostDescription: 'Recibes una solicitud y decides si la aceptas. Al huésped no se le cobra hasta entonces.',
    guestDescription: 'El anfitrión revisa tu solicitud. No se te cobra nada hasta que la acepte.',
  },
];

export function bookingModeOption(mode?: string | null): BookingModeOption {
  return BOOKING_MODE_OPTIONS.find((option) => option.value === mode) ?? BOOKING_MODE_OPTIONS[0];
}

/** Texto del cambio que se ofrece en «Mis publicaciones». */
export function otherBookingMode(mode?: string | null): BookingModeOption {
  return bookingModeOption(mode).value === 'INMEDIATA' ? BOOKING_MODE_OPTIONS[1] : BOOKING_MODE_OPTIONS[0];
}
