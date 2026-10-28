import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminModerationComponent, ApiPendingListing } from './admin-moderation.component';
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
      expect(component.feedbackMessage).toContain('2 reserva(s) futura(s) pasaron a EN_REVISION (RES-AAA, RES-BBB)');
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
});
