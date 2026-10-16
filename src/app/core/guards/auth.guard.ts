import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export interface StoredSession {
  token: string;
  email: string;
  name: string;
  role: 'HUESPED' | 'ANFITRION' | 'ADMINISTRADOR';
  expiresAt: number;
}

export const SESSION_STORAGE_KEY = 'stayhub_session';

export function getActiveSession(): StoredSession | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  const legacyToken = localStorage.getItem('token');

  if (!raw && !legacyToken) {
    return null;
  }

  if (raw) {
    try {
      const parsed: StoredSession = JSON.parse(raw);
      if (!parsed.token || Date.now() > parsed.expiresAt) {
        clearActiveSession();
        return null;
      }
      return parsed;
    } catch {
      clearActiveSession();
      return null;
    }
  }

  return null;
}

export function clearActiveSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem('token');
}

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const session = getActiveSession();
  if (session) {
    return true;
  }
  router.navigate(['/auth/login']);
  return false;
};
