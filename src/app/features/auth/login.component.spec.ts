import { LoginComponent } from './login.component';
import {
  checkRouteAccess,
  clearActiveSession,
  getActiveSession,
  SESSION_STORAGE_KEY,
} from '../../core/guards/auth.guard';

describe('LoginComponent & AuthGuard (HU-002 · MA-37)', () => {
  let component: LoginComponent;

  beforeEach(() => {
    clearActiveSession();
    component = new LoginComponent();
  });

  afterEach(() => {
    clearActiveSession();
  });

  it('CA1: should create authenticated session with role on valid login', async () => {
    component.email = 'admin@inversioneslr.com';
    component.password = 'AdminLr2026!';

    await component.onSubmit();

    expect(component.activeSession).toBeTruthy();
    expect(component.activeSession?.role).toBe('ADMINISTRADOR');
    expect(getActiveSession()?.email).toBe('admin@inversioneslr.com');
  });

  it('CA2: should show generic error message when credentials are invalid', async () => {
    component.email = 'noexiste@stayhub.com';
    component.password = 'ClaveErronea123';

    await component.onSubmit();

    expect(component.activeSession).toBeNull();
    expect(component.authError).toBe(LoginComponent.GENERIC_ERROR_MESSAGE);
  });

  it('CA4 & RNF-003: should invalidate session on logout or expiration', async () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token: 'jwt-expired',
        email: 'user@stayhub.com',
        name: 'User',
        role: 'HUESPED',
        expiresAt: Date.now() - 1000,
      }),
    );
    expect(getActiveSession()).toBeNull();

    component.email = 'admin@inversioneslr.com';
    component.password = 'AdminLr2026!';
    await component.onSubmit();
    expect(getActiveSession()).not.toBeNull();

    await component.onLogout();
    expect(component.activeSession).toBeNull();
    expect(getActiveSession()).toBeNull();
  });

  it('HU-003 CA1 & CA2: should redirect unauthenticated visitors to login and deny HUESPED on ANFITRION or ADMINISTRADOR routes', () => {
    expect(checkRouteAccess(null)).toBe('REDIRECT_LOGIN');
    expect(checkRouteAccess(null, ['HUESPED'])).toBe('REDIRECT_LOGIN');

    const guestSession = {
      token: 'jwt-guest',
      email: 'huesped@stayhub.com',
      name: 'Huésped',
      role: 'HUESPED' as const,
      expiresAt: Date.now() + 60000,
    };

    expect(checkRouteAccess(guestSession, ['HUESPED'])).toBe('ALLOW');
    expect(checkRouteAccess(guestSession, ['ANFITRION'])).toBe('ACCESS_DENIED');
    expect(checkRouteAccess(guestSession, ['ADMINISTRADOR'])).toBe(
      'ACCESS_DENIED',
    );
  });
});

