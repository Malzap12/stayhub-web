import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminModerationComponent, ApiPendingListing, ApiReviewBooking } from './admin-moderation.component';
import { SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';

describe('AdminModerationComponent · HU-050', () => {
  let component: AdminModerationComponent;
  let fixture: ComponentFixture<AdminModerationComponent>;
  let fetchSpy: jasmine.Spy;

  const pending: ApiPendingListing[] = [
    {
      id: 'pending-listing-2',
      title: 'Cabaña Alpina en Santa Elena',
      city: 'Medellín',
      maxGuests: 4,
      status: 'PENDIENTE_REVISION',
      hostName: 'Carlos Mendoza',
      requestedAt: '2026-10-16T14:30:00.000Z',
    },
    {
      id: 'pending-listing-1',
      title: 'Ático Minimalista en Laureles',
      city: 'Medellín',
      maxGuests: 2,
      status: 'PENDIENTE_REVISION',
      hostName: 'Laura Restrepo',
      requestedAt: '2026-10-14T08:15:00.000Z',
    },
  ];

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  const decision = (listingId: string, status: string, type: string, reason?: string) => ({
    listingId,
    status,
    returnReason: reason,
    notification: { id: 'notif-1', type, message: `Publicación ${type}`, reason, createdAt: '2026-10-22T10:00:00.000Z' },
  });

  beforeEach(async () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ token: 'jwt-admin', email: 'admin@inversioneslr.com', name: 'Admin', role: 'ADMINISTRADOR', expiresAt: Date.now() + 60_000 }),
    );
    await TestBed.configureTestingModule({
      imports: [AdminModerationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminModerationComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  const loadQueue = async () => {
    fetchSpy = spyOn(window, 'fetch').and.returnValue(json(pending));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('CA1: carga la cola del API con el token del admin y la ordena por fecha de solicitud', async () => {
    await loadQueue();

    const [url, init] = fetchSpy.calls.argsFor(0);
    expect(url).toBe('/api/listings/pending');
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-admin');
    expect(component.pendingQueue.map((l) => l.id)).toEqual(['pending-listing-1', 'pending-listing-2']);
    expect(component.pendingQueue[0].capacity).toBe(2);
  });

  it('CA2: al aprobar llama al API, la publicación pasa a ACTIVA y se notifica al anfitrión', async () => {
    await loadQueue();
    fetchSpy.and.returnValue(json(decision('pending-listing-1', 'ACTIVA', 'APROBADA')));

    await component.approveListing('pending-listing-1');

    const [url, init] = fetchSpy.calls.mostRecent().args;
    expect(url).toBe('/api/listings/pending-listing-1/approve');
    expect(init?.method).toBe('PATCH');
    expect(component.activeSearchListings.map((l) => l.id)).toEqual(['pending-listing-1']);
    expect(component.pendingQueue.map((l) => l.id)).toEqual(['pending-listing-2']);
    expect(component.notifications[0].type).toBe('APROBADA');
  });

  it('CA3: al devolver envía el motivo, la publicación pasa a BORRADOR y el anfitrión ve el motivo', async () => {
    await loadQueue();
    const motivo = 'Faltan fotografías nítidas de las habitaciones.';
    fetchSpy.and.returnValue(json(decision('pending-listing-2', 'BORRADOR', 'DEVUELTA', motivo)));

    component.openReturnPrompt('pending-listing-2');
    component.returnReasonInput = motivo;
    await component.confirmReturn('pending-listing-2');

    expect(JSON.parse(fetchSpy.calls.mostRecent().args[1]?.body as string)).toEqual({ reason: motivo });
    const returned = component.listings.find((l) => l.id === 'pending-listing-2');
    expect(returned?.status).toBe('BORRADOR');
    expect(returned?.returnReason).toBe(motivo);
    expect(component.notifications[0].reason).toBe(motivo);
  });

  it('CA3: sin motivo no llama al API', async () => {
    await loadQueue();
    fetchSpy.calls.reset();

    component.openReturnPrompt('pending-listing-2');
    await component.confirmReturn('pending-listing-2');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(component.returnError).toContain('motivo');
  });

  it('si el API rechaza la aprobación, la publicación sigue pendiente y se muestra el error', async () => {
    await loadQueue();
    fetchSpy.and.returnValue(json({ message: 'La publicación no está en estado PENDIENTE_REVISION' }, 400));

    await component.approveListing('pending-listing-1');

    expect(component.pendingQueue.length).toBe(2);
    expect(component.errorMessage).toContain('PENDIENTE_REVISION');
  });

  it('informa si la sesión del admin expiró', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ message: 'Debes iniciar sesión' }, 401));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.errorMessage).toContain('Tu sesión expiró');
  });

  describe('HU-051 · Bloquear una publicación engañosa', () => {
    const all: ApiPendingListing[] = [
      { id: 'activa-1', title: 'Villa engañosa en Barú', city: 'Cartagena', status: 'ACTIVA', hostName: 'Pedro' },
      { id: 'bloqueada-1', title: 'Loft ya bloqueado', city: 'Bogotá', status: 'BLOQUEADA', hostName: 'Ana', blockReason: 'Fotos falsas' },
    ];

    const loadAll = async () => {
      fetchSpy = spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) =>
        json(String(input).endsWith('/admin/all') ? all.map((item) => ({ ...item })) : pending),
      );
      component.activeTab = 'publicaciones';
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    it('lista todas las publicaciones en cualquier estado y solo ofrece bloquear las que no están BLOQUEADAS', async () => {
      await loadAll();

      expect(fetchSpy.calls.allArgs().map(([url]) => url)).toContain('/api/listings/admin/all');
      const items = (fixture.nativeElement as HTMLElement).querySelectorAll('.block-item');
      expect(items.length).toBe(2);
      expect(items[0].querySelector('.btn-block')).not.toBeNull();
      expect(items[1].querySelector('.btn-block')).toBeNull();
      expect(items[1].textContent).toContain('Fotos falsas');

      component.blockFilter = 'barú';
      expect(component.filteredAllListings.map((item) => item.id)).toEqual(['activa-1']);
    });

    it('CA1: exige el motivo antes de llamar al API', async () => {
      await loadAll();
      const calls = fetchSpy.calls.count();
      component.openBlockPrompt('activa-1');
      component.blockReasonInput = '  ';

      await component.confirmBlock('activa-1');

      expect(fetchSpy.calls.count()).toBe(calls);
      expect(component.blockError).toContain('motivo');
    });

    it('CA1, CA2 y CA3: bloquea con el motivo e informa las reservas que pasaron a revisión', async () => {
      await loadAll();
      fetchSpy.and.returnValue(
        json({
          listingId: 'activa-1',
          status: 'BLOQUEADA',
          previousStatus: 'ACTIVA',
          blockReason: 'Fotos que no corresponden',
          bookingsUnderReview: ['RES-AAA', 'RES-BBB'],
          notification: { id: 'n-1', type: 'BLOQUEADA', message: 'Tu publicación fue bloqueada', reason: 'Fotos que no corresponden', createdAt: '2026-10-27T10:00:00Z' },
        }),
      );
      component.openBlockPrompt('activa-1');
      component.blockReasonInput = '  Fotos que no corresponden  ';

      await component.confirmBlock('activa-1');

      const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
      expect(url).toBe('/api/listings/activa-1/block');
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(String(init.body))).toEqual({ reason: 'Fotos que no corresponden' });
      expect(component.allListings[0]).toEqual(jasmine.objectContaining({ status: 'BLOQUEADA', blockReason: 'Fotos que no corresponden' }));
      expect(component.feedbackMessage).toContain('2 reserva(s) futura(s) quedaron en revisión (RES-AAA, RES-BBB)');
      expect(component.notifications[0].type).toBe('BLOQUEADA');
      expect(component.blockingListingId).toBeNull();
    });

    it('muestra el error del API si el bloqueo se rechaza', async () => {
      await loadAll();
      fetchSpy.and.returnValue(json({ message: 'La publicación ya está BLOQUEADA' }, 400));
      component.openBlockPrompt('activa-1');
      component.blockReasonInput = 'Fotos que no corresponden';

      await component.confirmBlock('activa-1');

      expect(component.blockError).toBe('La publicación ya está BLOQUEADA');
      expect(component.allListings[0].status).toBe('ACTIVA');
    });
  });

  describe('HU-053 · Restringir a un usuario (CA1, CA2, CA3 · RF-070, RF-071, RN-020, RN-021)', () => {
    const users = [
      { id: 'user-huesped', name: 'Pedro Huésped', email: 'pedro@stayhub.com', role: 'HUESPED', status: 'ACTIVA' },
      { id: 'user-anfitrion', name: 'Ana Anfitriona', email: 'ana@stayhub.com', role: 'ANFITRION', status: 'ACTIVA' },
      { id: 'user-restringido', name: 'Malo Restringido', email: 'malo@stayhub.com', role: 'HUESPED', status: 'RESTRINGIDA', restrictionReason: 'Fiestas prohibidas' },
    ];

    const loadWithUsers = async () => {
      fetchSpy = spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/users')) return json(users.map((u) => ({ ...u })));
        if (url.endsWith('/admin/all')) return json([]);
        return json(pending);
      });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    };

    it('lista los usuarios registrados y distingue activos de restringidos', async () => {
      await loadWithUsers();

      expect(component.allUsers.length).toBe(3);
      expect(component.restrictedUsersCount).toBe(1);

      component.userFilter = 'anfitriona';
      expect(component.filteredUsers.map((u) => u.id)).toEqual(['user-anfitrion']);
    });

    it('CA1: exige el motivo de la restricción antes de llamar al API (al menos 5 caracteres)', async () => {
      await loadWithUsers();
      const callsBefore = fetchSpy.calls.count();

      component.openRestrictPrompt('user-anfitrion');
      component.restrictReasonInput = 'abc'; // Menos de 5 caracteres
      await component.confirmRestrict('user-anfitrion');

      expect(fetchSpy.calls.count()).toBe(callsBefore);
      expect(component.restrictError).toContain('motivo');
    });

    it('CA1 y CA2: restringe al usuario, invalida sesiones y reporta publicaciones pausadas y reservas a revisión', async () => {
      await loadWithUsers();

      fetchSpy.and.returnValue(
        json({
          userId: 'user-anfitrion',
          email: 'ana@stayhub.com',
          status: 'RESTRINGIDA',
          restrictionReason: 'Estafas y cancelaciones reiteradas',
          pausedListings: ['listing-1', 'listing-2'],
          bookingsUnderReview: ['RES-101', 'RES-102'],
          message: 'Usuario Ana Anfitriona restringido exitosamente.',
        }),
      );

      component.openRestrictPrompt('user-anfitrion');
      component.restrictReasonInput = 'Estafas y cancelaciones reiteradas';
      await component.confirmRestrict('user-anfitrion');

      const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
      expect(url).toBe('/api/users/user-anfitrion/restrict');
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(String(init.body))).toEqual({ reason: 'Estafas y cancelaciones reiteradas' });

      const updated = component.allUsers.find((u) => u.id === 'user-anfitrion');
      expect(updated?.status).toBe('RESTRINGIDA');
      expect(updated?.restrictionReason).toBe('Estafas y cancelaciones reiteradas');
      expect(component.feedbackMessage).toContain('quedó restringido');
      expect(component.feedbackMessage).toContain('2 publicación(es) quedaron pausadas');
      expect(component.feedbackMessage).toContain('2 reserva(s) quedaron en revisión');
      expect(component.restrictingUserId).toBeNull();
    });

    it('CA3: levanta la restricción al usuario e informa que sus publicaciones siguen pausadas', async () => {
      await loadWithUsers();

      fetchSpy.and.returnValue(
        json({
          userId: 'user-restringido',
          email: 'malo@stayhub.com',
          status: 'ACTIVA',
          message: 'Restricción levantada exitosamente.',
        }),
      );

      await component.confirmUnrestrict('user-restringido');

      const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
      expect(url).toBe('/api/users/user-restringido/unrestrict');
      expect(init.method).toBe('PATCH');

      const unmuted = component.allUsers.find((u) => u.id === 'user-restringido');
      expect(unmuted?.status).toBe('ACTIVA');
      expect(unmuted?.restrictionReason).toBeUndefined();
      expect(component.feedbackMessage).toContain('Restricción levantada');
      expect(component.feedbackMessage).toContain('sus publicaciones siguen pausadas');
    });
  });


  describe('Diseño de la moderación: pestañas, filtros y diálogo del motivo', () => {
    it('abre el diálogo de la acción elegida y lo cierra al cancelar', () => {
      component.allListings = [{ id: 'l1', title: 'Villa', status: 'ACTIVA' } as ApiPendingListing];
      component.openBlockPrompt('l1');
      expect(component.dialog).toEqual(jasmine.objectContaining({ kind: 'block', subject: 'Villa', confirm: 'Bloquear' }));
      component.setDialogReason('Fotos falsas');
      expect(component.blockReasonInput).toBe('Fotos falsas');
      component.closeDialog();
      expect(component.dialog).toBeNull();
    });

    it('filtra publicaciones por estado y usuarios por rol o restricción, con nombres legibles', () => {
      component.allListings = [
        { id: 'a', title: 'A', status: 'ACTIVA' },
        { id: 'b', title: 'B', status: 'BLOQUEADA' },
      ] as ApiPendingListing[];
      component.listingStatusFilter = 'BLOQUEADA';
      expect(component.visibleListings.map((item) => item.id)).toEqual(['b']);
      expect(component.countListings('ACTIVA')).toBe(1);

      component.allUsers = [
        { id: 'u1', name: 'Laura Gómez', email: 'l@x.com', role: 'HUESPED', status: 'ACTIVA' },
        { id: 'u2', name: 'Pedro', email: 'p@x.com', role: 'ANFITRION', status: 'RESTRINGIDA' },
      ];
      component.userRoleFilter = 'RESTRINGIDA';
      expect(component.visibleUsers.map((u) => u.id)).toEqual(['u2']);
      component.userRoleFilter = 'HUESPED';
      expect(component.visibleUsers.map((u) => u.id)).toEqual(['u1']);
      expect(component.roleLabel('ANFITRION')).toBe('Anfitrión');
      expect(component.userStatusLabel('RESTRINGIDA')).toBe('Restringida');
      expect(component.initials('Laura Gómez')).toBe('LG');
    });
  });
  describe('HU-052 · Resolver las reservas en revisión (CA1, CA2)', () => {
    const inReview: ApiReviewBooking[] = [
      {
        id: 'b-1',
        code: 'RES-AAA',
        listingId: 'l-1',
        listingTitle: 'Villa engañosa en Barú',
        guestId: 'huesped@prueba.com',
        checkIn: '2026-12-14',
        checkOut: '2026-12-17',
        guests: 2,
        totalAmount: 900000,
        currency: 'COP',
        reviewReason: 'La publicación fue bloqueada por el administrador: fotos falsas',
        underReviewAt: '2026-11-05T17:00:00.000Z',
        statusBeforeReview: 'CONFIRMADA',
      },
      {
        id: 'b-2',
        code: 'RES-BBB',
        listingId: 'l-1',
        listingTitle: 'Villa engañosa en Barú',
        guestId: 'otro@prueba.com',
        checkIn: '2026-12-20',
        checkOut: '2026-12-22',
        guests: 1,
        totalAmount: 500000,
        currency: 'COP',
        statusBeforeReview: 'PENDIENTE',
      },
    ];

    const loadReview = async () => {
      fetchSpy = spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) =>
        json(String(input).endsWith('/under-review') ? inReview.map((item) => ({ ...item })) : String(input).endsWith('/pending') ? pending : []),
      );
      fixture.detectChanges();
      await fixture.whenStable();
      component.activeTab = 'reservas';
      fixture.detectChanges();
    };

    it('carga las reservas en revisión y las muestra con su huésped, fechas, total y motivo', async () => {
      await loadReview();

      expect(fetchSpy.calls.allArgs().map(([url]) => url)).toContain('/api/bookings/under-review');
      const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.review-card');
      expect(cards.length).toBe(2);
      expect(cards[0].textContent).toContain('RES-AAA');
      expect(cards[0].textContent).toContain('huesped@prueba.com');
      expect(cards[0].textContent).toContain('3 noches');
      expect(cards[0].textContent).toContain('fotos falsas');
      expect(cards[1].textContent).toContain('sin pagar');
      expect((fixture.nativeElement as HTMLElement).querySelector('.tab-reservas')?.textContent).toContain('2');
      expect((fixture.nativeElement as HTMLElement).textContent).not.toMatch(/EN_REVISION|CONFIRMADA|PENDIENTE/);
    });

    it('CA1: mantener envía la decisión con la nota, quita la reserva de la lista y avisa', async () => {
      await loadReview();
      fetchSpy.and.returnValue(json({ id: 'b-1', status: 'CONFIRMADA' }));
      component.openResolvePrompt('b-1', 'MANTENER');
      expect(component.dialog).toEqual(jasmine.objectContaining({ kind: 'keep', optional: true, confirm: 'Mantener reserva' }));
      component.setDialogReason('  Alojamiento verificado  ');

      await component.confirmDialog();

      const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
      expect(url).toBe('/api/bookings/b-1/resolve-review');
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(String(init.body))).toEqual({ decision: 'MANTENER', note: 'Alojamiento verificado' });
      expect(component.reviewBookings.map((item) => item.id)).toEqual(['b-2']);
      expect(component.feedbackMessage).toContain('RES-AAA se mantuvo y sigue confirmada');
      expect(component.dialog).toBeNull();
    });

    it('CA2: cancelar informa la devolución del 100 % y las noches liberadas', async () => {
      await loadReview();
      fetchSpy.and.returnValue(json({ id: 'b-1', status: 'CANCELADA', cancellation: { refundAmount: 900000, releasedNights: ['2026-12-14', '2026-12-15', '2026-12-16'] } }));
      component.openResolvePrompt('b-1', 'CANCELAR');
      expect(component.dialog?.help).toContain('100 %');

      await component.confirmResolve('b-1');

      expect(JSON.parse(String((fetchSpy.calls.mostRecent().args[1] as RequestInit).body))).toEqual({ decision: 'CANCELAR' });
      expect(component.feedbackMessage).toContain('RES-AAA quedó cancelada');
      expect(component.feedbackMessage).toContain('(100 %)');
      expect(component.feedbackMessage).toContain('3 noche(s) quedaron libres');
      expect(component.reviewBookings.length).toBe(1);
    });

    it('si el API rechaza la decisión, la reserva sigue en la lista y se muestra el error en el diálogo', async () => {
      await loadReview();
      fetchSpy.and.returnValue(json({ message: 'Solo se resuelven reservas en revisión' }, 400));
      component.openResolvePrompt('b-2', 'MANTENER');

      await component.confirmResolve('b-2');

      expect(component.dialogError).toBe('Solo se resuelven reservas en revisión');
      expect(component.reviewBookings.length).toBe(2);
    });

    it('al abrir la pestaña vuelve a consultar las reservas en revisión', async () => {
      await loadReview();
      fetchSpy.calls.reset();

      component.openReviewTab();
      await fixture.whenStable();

      expect(fetchSpy.calls.allArgs().map(([url]) => url)).toEqual(['/api/bookings/under-review']);
    });

    it('la devolución de una reserva sin pagar es de 0', () => {
      expect(component.refundOf(inReview[1])).not.toContain('500');
      expect(component.refundOf(inReview[0])).toContain('900.000');
    });
  });
});
