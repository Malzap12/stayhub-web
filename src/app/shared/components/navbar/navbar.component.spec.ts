import { NavbarComponent, THEME_STORAGE_KEY } from './navbar.component';
import {
  clearActiveSession,
  SESSION_STORAGE_KEY,
} from '../../../core/guards/auth.guard';
import { Router } from '@angular/router';

describe('NavbarComponent (HU-003 · MA-38 · HU-073)', () => {
  let component: NavbarComponent;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    clearActiveSession();
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
    mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
    component = new NavbarComponent(mockRouter);
  });

  afterEach(() => {
    clearActiveSession();
    localStorage.removeItem(THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  });

  it('CA1: should show only public exploration when unauthenticated', () => {
    expect(component.session).toBeNull();
    expect(component.isHuesped).toBeFalse();
    expect(component.isAnfitrion).toBeFalse();
    expect(component.isAdmin).toBeFalse();
    expect(component.canViewMyBookings).toBeFalse();
    expect(component.canExplore).toBeTrue();
  });

  it('oculta los enlaces redundantes de acceso cuando el visitante ya se encuentra en rutas /auth/*', () => {
    const loginNav = new NavbarComponent({ url: '/auth/login', navigate: mockRouter.navigate } as unknown as Router);
    const registerNav = new NavbarComponent({ url: '/auth/register', navigate: mockRouter.navigate } as unknown as Router);
    const publicNav = new NavbarComponent({ url: '/listings', navigate: mockRouter.navigate } as unknown as Router);

    expect(loginNav.isAuthRoute).toBeTrue();
    expect(registerNav.isAuthRoute).toBeTrue();
    expect(publicNav.isAuthRoute).toBeFalse();
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

    component.isMobileMenuOpen = true;
    component.logout();

    expect(component.session).toBeNull();
    expect(component.isMobileMenuOpen).toBeFalse();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('HU-073 CA1: alterna y cierra el menú de navegación móvil correctamente', () => {
    expect(component.isMobileMenuOpen).toBeFalse();
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBeTrue();
    component.closeMobileMenu();
    expect(component.isMobileMenuOpen).toBeFalse();
  });

  it('HU-073 CA2: alterna entre modo claro y oscuro y persiste en localStorage y data-theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const themedNav = new NavbarComponent(mockRouter);

    expect(themedNav.theme).toBe('light');
    expect(themedNav.isDarkMode).toBeFalse();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    themedNav.toggleTheme();
    expect(themedNav.theme).toBe('dark');
    expect(themedNav.isDarkMode).toBeTrue();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    themedNav.toggleTheme();
    expect(themedNav.theme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
