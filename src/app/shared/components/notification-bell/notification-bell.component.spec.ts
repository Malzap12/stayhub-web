import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppNotification, NotificationBellComponent } from './notification-bell.component';

describe('NotificationBellComponent · HU-043, HU-044 & HU-045 Notificaciones', () => {
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

  it('CA3: marca todas como leídas y deja el contador en cero', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ updated: 2, unread: 0 }));
    component.notifications = [{ ...confirmed }, { ...confirmed, id: 'notif-2' }];
    component.unread = 2;

    await component.markAllAsRead();

    expect(component.notifications.every((item) => item.read)).toBeTrue();
    expect(component.unread).toBe(0);
  });

  it('HU-045 CA1: muestra el contador de notificaciones no leídas al ingresar a la plataforma', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValues(
      json({ data: [confirmed, { ...confirmed, id: 'notif-2' }, { ...confirmed, id: 'notif-3' }], unread: 3 }),
      json({ unread: 3 }),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('.badge');
    expect(badge?.textContent?.trim()).toBe('3');

    await component.refreshUnreadCount();
    expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/notifications/unread-count');
    expect(component.unread).toBe(3);
  });

  it('HU-045 CA2: marca una notificación individual como leída sin navegar y actualiza el contador', async () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl');
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json({ ...confirmed, read: true }));
    component.notifications = [{ ...confirmed }, { ...confirmed, id: 'notif-2' }];
    component.unread = 2;
    component.open = true;
    fixture.detectChanges();

    await component.markOneAsRead(component.notifications[0], new MouseEvent('click'));
    fixture.detectChanges();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/notifications/notif-1/read',
      jasmine.objectContaining({ method: 'PATCH' }),
    );
    expect(component.notifications[0].read).toBeTrue();
    expect(component.unread).toBe(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('HU-045 CA2: selecciona varias notificaciones, las marca como leídas en lote y actualiza el contador', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json({ updated: 2, unread: 1 }));
    component.notifications = [
      { ...confirmed, id: 'notif-1' },
      { ...confirmed, id: 'notif-2' },
      { ...confirmed, id: 'notif-3' },
    ];
    component.unread = 3;
    component.open = true;

    component.toggleSelection('notif-1', { stopPropagation: () => undefined, target: { checked: true } } as unknown as Event);
    component.toggleSelection('notif-2', { stopPropagation: () => undefined, target: { checked: true } } as unknown as Event);
    fixture.detectChanges();

    expect(component.selectedIds.size).toBe(2);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Marcar seleccionadas (2)');

    await component.markSelectedAsRead();
    fixture.detectChanges();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/notifications/read',
      jasmine.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ ids: ['notif-1', 'notif-2'] }),
      }),
    );
    expect(component.notifications[0].read).toBeTrue();
    expect(component.notifications[1].read).toBeTrue();
    expect(component.notifications[2].read).toBeFalse();
    expect(component.selectedIds.size).toBe(0);
    expect(component.unread).toBe(1);
  });

  it('HU-045 CA2: filtra solo las notificaciones no leídas para distinguir las nuevas', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(
      json({ data: [confirmed], unread: 1, page: 1, limit: 10, total: 1, totalPages: 1 }),
    );
    component.open = true;

    await component.setFilter(true);
    fixture.detectChanges();

    expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/notifications?unread=true');
    expect(component.onlyUnread).toBeTrue();
    expect(component.visibleNotifications.length).toBe(1);
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
