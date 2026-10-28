export type ListingStatus =
  | 'BORRADOR'
  | 'PENDIENTE_REVISION'
  | 'ACTIVA'
  | 'PAUSADA'
  | 'BLOQUEADA';

export interface AvailabilityPeriod {
  id: string;
  listingId: string;
  startDate: string;
  endDate: string;
  availableForBooking: boolean;
  createdAt?: string;
}

/** HU-023 · Periodo reservado o bloqueado en intervalo de noches [checkIn, checkOut) (AMB-09). */
export interface BlockedPeriod {
  id: string;
  listingId: string;
  bookingId?: string;
  /** HU-022: reserva confirmada o bloqueo de fechas del anfitrión. */
  type?: 'RESERVA' | 'BLOQUEO';
  checkIn: string;
  checkOut: string;
  blockedNights: string[];
  createdAt?: string;
}

/** HU-023 · Resultado de consultar la disponibilidad de un rango [startDate, endDate). */
export interface AvailabilityCheckResult {
  listingId: string;
  isAvailable: boolean;
  blockedDates: string[];
  pricePerNight: number;
  availablePeriods?: AvailabilityPeriod[];
  reservedPeriods?: BlockedPeriod[];
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  city: string;
  capacity: number;
  pricePerNight: number;
  status: ListingStatus;
  amenities: string[];
  hostId?: string;
  hostName?: string;
  requestedAt?: string;
  returnReason?: string;
  imageUrl?: string;
}

export interface HostModerationNotification {
  id: string;
  listingId: string;
  listingTitle: string;
  hostName: string;
  type: 'APROBADA' | 'DEVUELTA' | 'BLOQUEADA';
  message: string;
  reason?: string;
  createdAt: string;
}

/** HU-012 · Elemento del listado «Mis publicaciones» (GET /api/listings/mine). */
export interface MyListing {
  id: string;
  title: string;
  city?: string;
  pricePerNight?: number;
  status: ListingStatus;
  statusLabel: string;
  adminReasonType?: 'DEVUELTA' | 'BLOQUEADA';
  adminReason?: string;
  isComplete: boolean;
  missingFields: string[];
  createdAt: string;
}

/** HU-015 · Descuento por estancia larga: porcentaje (0-50 %) desde un mínimo de noches. */
export interface LongStayDiscount {
  minNights: number;
  percentage: number;
}

/** HU-015 · Tarifas de la publicación (GET/PATCH /api/listings/:id/pricing). */
export interface ListingPricing {
  listingId: string;
  cleaningFee: number;
  longStayDiscount: LongStayDiscount | null;
  currency: string;
}
