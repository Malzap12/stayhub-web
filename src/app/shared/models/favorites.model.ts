export interface FavoriteListingItem {
  id: string;
  listingId: string;
  title: string;
  city: string;
  pricePerNight: number;
  currency: string;
  rating: number;
  imageUrl?: string;
  status: string;
  available: boolean;
  savedAt: string;
}

export interface FavoritesPage {
  data: FavoriteListingItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FavoriteToggleResult {
  listingId: string;
  saved: boolean;
  savedAt?: string;
}

export function canShowFavoriteControl(role?: string | null): boolean {
  return !role || role === 'HUESPED';
}
