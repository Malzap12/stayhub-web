export interface Listing {
  id: string;
  title: string;
  description: string;
  city: string;
  capacity: number;
  pricePerNight: number;
  status: 'BORRADOR' | 'PENDIENTE_REVISION' | 'ACTIVA' | 'PAUSADA' | 'BLOQUEADA';
  amenities: string[];
}
