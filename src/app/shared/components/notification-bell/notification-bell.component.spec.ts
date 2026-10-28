import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppNotification, NotificationBellComponent } from './notification-bell.component';

describe('NotificationBellComponent · HU-043 & HU-044 Consultar y recibir notificaciones', () => {
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

  it('HU-044 CA1: ordena las notificaciones de la más reciente a la más antigua y soporta paginación', async () => {
    const older: AppNotification = {
      ...confirmed,
      id: 'notif-older',
      message: 'Notificación antigua',
      createdAt: '2027-05-01T10:00:00Z',
    };
    const newer: AppNotification = {
      ...confirmed,
      id: 'notif-newer',
      message: 'Notificación reciente',
      createdAt: '2027-05-02T10:00:00Z',
    };
    const fetchSpy = spyOn(window, 'fetch').and.returnValues(
      json({ data: [older, newer], unread: 2, page: 1, limit: 2, total: 4, totalPages: 2 }),
      json({ data: [older], unread: 2, page: 2, limit: 2, total: 4, totalPages: 2 }),
    );

    await component.load();
    component.open = true;
    fixture.detectChanges();

    expect(component.visibleNotifications.map((n) => n.id)).toEqual(['notif-newer', 'notif-older']);
    expect(component.totalPages).toBe(2);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Página 1 de 2');

    await component.goToPage(2);
    fixture.detectChanges();

    expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/notifications?page=2&limit=10');
    expect(component.page).toBe(2);
  });

  it('CA3 / HU-044 CA2: abrir una notificación la marca como leída y navega al detalle de la reserva', async () => {
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

  it('HU-046 CA3: la invitación a reseñar lleva al huésped a Mis reservas', () => {
    const completed: AppNotification = { ...confirmed, type: 'RESERVA_COMPLETADA', message: '¡Cuéntanos cómo te fue y reseña el alojamiento!' };
    expect(component.label('RESERVA_COMPLETADA')).toBe('Estancia completada');
    expect(component.routeFor(completed)).toBe('/mis-reservas');
  });

  it('CA2 / HU-044 CA2: navega al detalle de publicación o reserva según la entidad relacionada', () => {
    sessionStorage.setItem('auth_session', JSON.stringify({ token: 'jwt-host', role: 'ANFITRION', expiresAt: Date.now() + 3_600_000 }));
    expect(component.routeFor({ ...confirmed, entity: 'Listing', type: 'PUBLICACION_DEVUELTA' })).toBe('/anfitrion/mis-publicaciones');
    expect(component.routeFor({ ...confirmed, entity: 'Listing', entityId: 'listing-9', type: 'PUBLICACION_APROBADA' })).toBe('/listings/listing-9');
    expect(component.routeFor({ ...confirmed, entity: 'Booking', entityId: 'booking-1' })).toBe('/anfitrion/publicaciones');
    expect(component.routeFor({ ...confirmed, entityId: '' })).toBeNull();
    expect(component.label('CUENTA_RESTRINGIDA')).toBe('Cuenta restringida');
    expect(component.label('OTRO')).toBe('Notificación');
  });
});
