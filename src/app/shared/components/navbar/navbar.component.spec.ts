import { NavbarComponent } from './navbar.component';
import {
  clearActiveSession,
  SESSION_STORAGE_KEY,
} from '../../../core/guards/auth.guard';
import { Router } from '@angular/router';

describe('NavbarComponent (HU-003 · MA-38)', () => {
  let component: NavbarComponent;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    clearActiveSession();
    mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
    component = new NavbarComponent(mockRouter);
  });

  afterEach(() => {
    clearActiveSession();
  });

  it('CA1: should show only public exploration when unauthenticated', () => {
    expect(component.session).toBeNull();
    expect(component.isHuesped).toBeFalse();
    expect(component.isAnfitrion).toBeFalse();
    expect(component.isAdmin).toBeFalse();
    expect(component.canViewMyBookings).toBeFalse();
    expect(component.canExplore).toBeTrue();
  });

  it('CA2: should show only guest modules when logged in as HUESPED', () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token: 'token-guest',
        email: 'huesped@inversioneslr.com',
        name: 'Carlos Huesped',
        role: 'HUESPED',
        expiresAt: Date.now() + 60000,
      }),
    );

    expect(component.session).toBeTruthy();
    expect(component.isHuesped).toBeTrue();
    expect(component.canViewMyBookings).toBeTrue();
    expect(component.canExplore).toBeTrue();
    expect(component.isAnfitrion).toBeFalse();
    expect(component.isAdmin).toBeFalse();
  });

  it('CA2: should show host modules when logged in as ANFITRION', () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token: 'token-host',
        email: 'anfitrion@inversioneslr.com',
        name: 'Maria Anfitriona',
        role: 'ANFITRION',
        expiresAt: Date.now() + 60000,
      }),
    );

    expect(component.session).toBeTruthy();
    expect(component.isHuesped).toBeFalse();
    expect(component.isAnfitrion).toBeTrue();
    expect(component.isAdmin).toBeFalse();
    expect(component.canViewMyBookings).toBeFalse();
    expect(component.canExplore).toBeTrue();
  });

  it('CA3: el ADMINISTRADOR ve solo los módulos de administración (RN-001, RN-002)', () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token: 'token-admin',
        email: 'admin@inversioneslr.com',
        name: 'Admin Global',
        role: 'ADMINISTRADOR',
        expiresAt: Date.now() + 60000,
      }),
    );

    expect(component.session).toBeTruthy();
    expect(component.isAdmin).toBeTrue();
    expect(component.isAnfitrion).toBeFalse();
    expect(component.canViewMyBookings).toBeFalse();
    expect(component.canExplore).toBeFalse();
  });

  it('CA4: should clear session and navigate to login on logout', () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token: 'token-user',
        email: 'user@inversioneslr.com',
        name: 'User Test',
        role: 'HUESPED',
        expiresAt: Date.now() + 60000,
      }),
    );

    component.logout();

    expect(component.session).toBeNull();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
