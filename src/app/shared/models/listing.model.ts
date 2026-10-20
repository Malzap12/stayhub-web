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
  type: 'APROBADA' | 'DEVUELTA';
  message: string;
  reason?: string;
  createdAt: string;
}
