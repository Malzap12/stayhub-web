import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppNotification, NotificationBellComponent } from './notification-bell.component';

describe('NotificationBellComponent · HU-043 Recibir notificaciones de los eventos', () => {
  let fixture: ComponentFixture<NotificationBellComponent>;
  let component: NotificationBellComponent;

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const confirmed: AppNotification = {
    id: 'notif-1',
    type: 'RESERVA_CONFIRMADA',
    message: 'Tu reserva RES-1A2B3C4D en "Cabaña" del 2027-05-10 al 2027-05-13 está confirmada.',
    entity: 'Booking',
    entityId: 'booking-1',
    bookingCode: 'RES-1A2B3C4D',
    createdAt: '2027-05-01T15:00:00Z',
    read: false,
  };

  beforeEach(async () => {
    sessionStorage.setItem('auth_session', JSON.stringify({ token: 'jwt-guest', role: 'HUESPED', expiresAt: Date.now() + 3_600_000 }));
    await TestBed.configureTestingModule({ imports: [NotificationBellComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.ngOnDestroy();
    sessionStorage.clear();
  });

  it('CA1: carga las notificaciones del usuario y muestra cuántas hay sin leer', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json({ data: [confirmed], unread: 1 }));

    await component.load();
    component.open = true;
    fixture.detectChanges();

    expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/notifications');
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('1');
    expect(text).toContain('Reserva confirmada');
    expect(text).toContain('RES-1A2B3C4D');
  });

  it('CA3: abrir una notificación la marca como leída y lleva a la reserva', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json({ ...confirmed, read: true }));
    component.notifications = [{ ...confirmed }];
    component.unread = 1;

    await component.openNotification(component.notifications[0]);

    expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/notifications/notif-1/read');
    expect(component.notifications[0].read).toBeTrue();
    expect(component.unread).toBe(0);
    expect(navigate).toHaveBeenCalledWith('/mis-reservas/booking-1');
  });

  it('CA3: marca todas como leídas', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ updated: 2 }));
    component.notifications = [{ ...confirmed }, { ...confirmed, id: 'notif-2' }];
    component.unread = 2;

    await component.markAllAsRead();

    expect(component.notifications.every((item) => item.read)).toBeTrue();
    expect(component.unread).toBe(0);
  });

  it('CA2: lleva al anfitrión a sus publicaciones y nombra cada tipo de evento', () => {
    sessionStorage.setItem('auth_session', JSON.stringify({ token: 'jwt-host', role: 'ANFITRION', expiresAt: Date.now() + 3_600_000 }));
    expect(component.routeFor({ ...confirmed, entity: 'Listing', type: 'PUBLICACION_DEVUELTA' })).toBe('/anfitrion/mis-publicaciones');
    expect(component.label('CUENTA_RESTRINGIDA')).toBe('Cuenta restringida');
    expect(component.label('OTRO')).toBe('Notificación');
  });
});
