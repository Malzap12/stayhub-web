import { LoginComponent } from './login.component';
import {
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
});
