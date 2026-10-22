import {
  checkRouteAccess,
  clearActiveSession,
  getActiveSession,
  saveActiveSession,
  SESSION_STORAGE_KEY,
  StoredSession,
  updateActiveSessionName,
} from './auth.guard';

describe('Sesión activa por pestaña (HU-002, HU-003)', () => {
  const guest: StoredSession = {
    token: 'jwt-huesped',
    email: 'huesped@stayhub.com',
    name: 'Huésped',
    role: 'HUESPED',
    expiresAt: Date.now() + 60_000,
  };

  afterEach(() => {
    sessionStorage.clear();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('token');
  });

  it('guarda la sesión solo en la pestaña actual (sessionStorage), no en localStorage', () => {
    saveActiveSession(guest);

    expect(getActiveSession()).toEqual(guest);
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('una sesión de admin guardada en localStorage por otra pestaña no reemplaza la de esta pestaña', () => {
    saveActiveSession(guest);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...guest, token: 'jwt-admin', role: 'ADMINISTRADOR' }));

    expect(getActiveSession()?.role).toBe('HUESPED');
  });

  it('descarta la sesión vencida', () => {
    saveActiveSession({ ...guest, expiresAt: Date.now() - 1000 });

    expect(getActiveSession()).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('actualiza el nombre y cierra la sesión, limpiando también restos de versiones anteriores', () => {
    saveActiveSession(guest);
    localStorage.setItem('token', 'jwt-viejo');

    updateActiveSessionName('Laura');
    expect(getActiveSession()?.name).toBe('Laura');

    clearActiveSession();
    expect(getActiveSession()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('decide el acceso según el rol de la sesión de la pestaña', () => {
    expect(checkRouteAccess(null)).toBe('REDIRECT_LOGIN');
    expect(checkRouteAccess(guest, ['ADMINISTRADOR'])).toBe('ACCESS_DENIED');
    expect(checkRouteAccess(guest, ['HUESPED'])).toBe('ALLOW');
  });

  it('las rutas de anfitrión (solo ANFITRION) niegan el acceso al ADMINISTRADOR y al HUÉSPED (RN-001, RN-002)', () => {
    const admin: StoredSession = { ...guest, role: 'ADMINISTRADOR' };
    const host: StoredSession = { ...guest, role: 'ANFITRION' };

    expect(checkRouteAccess(admin, ['ANFITRION'])).toBe('ACCESS_DENIED');
    expect(checkRouteAccess(guest, ['ANFITRION'])).toBe('ACCESS_DENIED');
    expect(checkRouteAccess(host, ['ANFITRION'])).toBe('ALLOW');
    expect(checkRouteAccess(host, ['HUESPED'])).toBe('ACCESS_DENIED');
    expect(checkRouteAccess(admin, ['HUESPED'])).toBe('ACCESS_DENIED');
  });
});
