export type BookingStatus =
  | 'CONFIRMADA'
  | 'PENDIENTE_APROBACION'
  | 'EN_REVISION'
  | 'COMPLETADA'
  | 'CANCELADA';

export interface Booking {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCity: string;
  imageUrl?: string;
  guestId: string;
  guestName?: string;
  hostName?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  nightlyRate: number;
  baseAmount: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
  status: BookingStatus;
  cancellationPolicy: 'Flexible' | 'Moderada' | 'Estricta';
  cancellationReason?: string;
  cancelledAt?: string;
  refundAmount?: number;
  rating?: number;
  reviewComment?: string;
  reviewedAt?: string;
}
