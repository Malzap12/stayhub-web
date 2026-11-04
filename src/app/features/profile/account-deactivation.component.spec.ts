import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AccountDeactivationComponent } from './account-deactivation.component';
import { getActiveSession, SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';
import { DeactivationCheck, UpcomingStay } from '../../shared/models/account-deactivation.model';
import { LoginComponent } from '../auth/login.component';

describe('AccountDeactivationComponent · HU-008 Desactivar mi cuenta', () => {
  let fixture: ComponentFixture<AccountDeactivationComponent>;
  let component: AccountDeactivationComponent;

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const stay: UpcomingStay = {
    id: 'booking-1',
    code: 'RES-1A2B3C4D',
    listingId: 'listing-1',
    listingTitle: 'Casa en Jardín',
    checkIn: '2026-12-10',
    checkOut: '2026-12-13',
    guests: 2,
    relation: 'HUESPED',
  };
  const free: DeactivationCheck = { canDeactivate: true, upcomingBookings: [], listingsToPause: [] };
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => (element().textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ token: 'jwt-user', email: 'ana@prueba.com', name: 'Ana', role: 'HUESPED', expiresAt: Date.now() + 3_600_000 }),
    );
    await TestBed.configureTestingModule({ imports: [AccountDeactivationComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(AccountDeactivationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => sessionStorage.clear());

  it('CA1: pide confirmación antes de desactivar', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(free));

    await component.review();
    fixture.detectChanges();

    expect(fetchSpy).toHaveBeenCalledOnceWith('/api/users/me/deactivation', jasmine.objectContaining({ headers: { Authorization: 'Bearer jwt-user' } }));
    expect(component.step).toBe('confirm');
    expect(element().querySelector('.confirm-box')?.textContent).toContain('¿Seguro que quieres desactivar tu cuenta?');
    expect(text()).toContain('Tu historial se conserva');
  });

  it('CA1: al confirmar desactiva, cierra la sesión y vuelve al inicio de sesión con el aviso', async () => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json({ status: 'DESACTIVADA', pausedListings: [], message: 'ok' }));

    await component.deactivate();

    expect(fetchSpy).toHaveBeenCalledWith('/api/users/me/deactivate', jasmine.objectContaining({ method: 'POST' }));
    expect(getActiveSession()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/auth/login'], { state: { accountDeactivated: true } });
  });

  it('CA2: con reservas futuras confirmadas no deja continuar y las muestra', async () => {
    spyOn(window, 'fetch').and.returnValue(
      json({ canDeactivate: false, upcomingBookings: [stay, { ...stay, id: 'booking-2', relation: 'ANFITRION', guests: 1 }], listingsToPause: [] }),
    );

    await component.review();
    fixture.detectChanges();

    expect(component.step).toBe('blocked');
    expect(element().querySelector('.confirm-btn')).toBeNull();
    expect(text()).toContain('Tienes 2 reservas futuras confirmadas, así que aún no puedes desactivar tu cuenta.');
    const items = element().querySelectorAll('.stay-item');
    expect(items[0].textContent).toContain('Tu reserva');
    expect(items[0].textContent).toContain('2 huéspedes');
    expect(items[1].textContent).toContain('Reserva de un huésped en tu alojamiento');
    const links = Array.from(element().querySelectorAll('.stay-link')).map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/mis-reservas/booking-1', '/anfitrion/reservas/booking-2']);
  });

  it('CA2: si al confirmar el API responde 409 muestra las reservas y conserva la sesión', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ code: 'RESERVAS_FUTURAS_CONFIRMADAS', upcomingBookings: [stay] }, 409));

    await component.deactivate();
    fixture.detectChanges();

    expect(component.step).toBe('blocked');
    expect(text()).toContain('Tienes 1 reserva futura confirmada');
    expect(getActiveSession()).not.toBeNull();
  });

  it('CA3: avisa qué publicaciones activas se pausarán', async () => {
    spyOn(window, 'fetch').and.returnValue(
      json({ ...free, listingsToPause: [{ id: 'l-1', title: 'Casa en Jardín' }, { id: 'l-2', title: 'Loft en Laureles' }] }),
    );

    await component.review();
    fixture.detectChanges();

    const note = element().querySelector('.pause-note')?.textContent ?? '';
    expect(note).toContain('pasarán a pausadas');
    expect(note).toContain('Casa en Jardín');
    expect(note).toContain('Loft en Laureles');
  });

  it('cancelar vuelve al estado inicial sin llamar al API', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(free));
    await component.review();

    component.reset();
    fixture.detectChanges();

    expect(component.step).toBe('idle');
    expect(fetchSpy.calls.count()).toBe(1);
    expect(element().querySelector('.start-btn')).not.toBeNull();
  });

  it('muestra el error del API sin desactivar', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ message: 'Acceso denegado' }, 403));

    await component.deactivate();

    expect(component.step).toBe('idle');
    expect(component.errorMessage).toBe('Acceso denegado');
    expect(getActiveSession()).not.toBeNull();
  });

  it('el inicio de sesión explica que la cuenta está desactivada', async () => {
    sessionStorage.clear();
    spyOn(window, 'fetch').and.returnValue(
      json({ statusCode: 403, reason: 'CUENTA_DESACTIVADA', message: 'Tu cuenta está desactivada. Tu historial se conserva.' }, 403),
    );
    const login = new LoginComponent();
    login.email = 'ana@prueba.com';
    login.password = 'Password123';

    await login.onSubmit();

    expect(login.deactivatedNotice).toBe('Tu cuenta está desactivada. Tu historial se conserva.');
    expect(login.restrictedError).toBe('');
  });
});
