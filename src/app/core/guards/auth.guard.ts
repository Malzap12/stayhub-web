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

/**
 * La sesión vive en sessionStorage, que es propio de cada pestaña: así se puede
 * tener una pestaña por rol (huésped, anfitrión, administrador) sin que iniciar
 * sesión en una reemplace la sesión de las demás. localStorage lo comparten todas.
 */
export function getActiveSession(): StoredSession | null {
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

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

export function saveActiveSession(session: StoredSession): void {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/** HU-007: refleja en la barra superior el nombre actualizado desde el perfil. */
export function updateActiveSessionName(name: string): void {
  const session = getActiveSession();
  if (session) {
    saveActiveSession({ ...session, name });
  }
}

export function clearActiveSession(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  // Restos de versiones anteriores, que guardaban la sesión compartida entre pestañas.
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem('token');
}

export type AccessDecision = 'ALLOW' | 'REDIRECT_LOGIN' | 'ACCESS_DENIED';

export function checkRouteAccess(
  session: StoredSession | null,
  allowedRoles?: Array<StoredSession['role']>,
): AccessDecision {
  if (!session) {
    return 'REDIRECT_LOGIN';
  }
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return 'ACCESS_DENIED';
  }
  return 'ALLOW';
}

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const decision = checkRouteAccess(getActiveSession());
  if (decision === 'ALLOW') {
    return true;
  }
  router.navigate(['/auth/login']);
  return false;
};

export function roleGuard(
  allowedRoles: Array<StoredSession['role']>,
): CanActivateFn {
  return () => {
    const router = inject(Router);
    const decision = checkRouteAccess(getActiveSession(), allowedRoles);
    if (decision === 'ALLOW') {
      return true;
    }
    if (decision === 'REDIRECT_LOGIN') {
      router.navigate(['/auth/login']);
      return false;
    }
    router.navigate(['/acceso-denegado']);
    return false;
  };
}

