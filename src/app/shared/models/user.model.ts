export type UserRole = 'HUESPED' | 'ANFITRION' | 'ADMINISTRADOR';
export type AccountStatus = 'ACTIVA' | 'DESACTIVADA' | 'RESTRINGIDA';

/** HU-006 · Datos básicos que devuelve GET /api/users/me. */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
}
