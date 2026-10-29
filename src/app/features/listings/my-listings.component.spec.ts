import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyListingsComponent } from './my-listings.component';
import { MyListing } from '../../shared/models/listing.model';

describe('MyListingsComponent · HU-012', () => {
  let component: MyListingsComponent;
  let fixture: ComponentFixture<MyListingsComponent>;
  let element: HTMLElement;

  const listings: MyListing[] = [
    {
      id: 'listing-1',
      title: 'Cabaña del Bosque',
      city: 'Guatapé',
      pricePerNight: 320000,
      status: 'BORRADOR',
      statusLabel: 'Borrador',
      adminReasonType: 'DEVUELTA',
      adminReason: 'Las fotografías están oscuras.',
      isComplete: true,
      missingFields: [],
      createdAt: '2026-10-20T10:00:00.000Z',
    },
    {
      id: 'listing-2',
      title: 'Ático en Laureles',
      city: 'Medellín',
      pricePerNight: 290000,
      status: 'BLOQUEADA',
      statusLabel: 'Bloqueada',
      adminReasonType: 'BLOQUEADA',
      adminReason: 'Fotografías que no corresponden al inmueble.',
      isComplete: true,
      missingFields: [],
      createdAt: '2026-10-19T10:00:00.000Z',
    },
    {
      id: 'listing-3',
      title: 'Apartamento sin terminar',
      status: 'BORRADOR',
      statusLabel: 'Borrador',
      isComplete: false,
      missingFields: ['city', 'pricePerNight'],
      createdAt: '2026-10-18T10:00:00.000Z',
    },
  ];

  const respondWith = (status: number, body: unknown) =>
    spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify(body), { status }));

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyListingsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MyListingsComponent);
    component = fixture.componentInstance;
  });

  it('CA1: muestra cada publicación con título, ciudad, precio y estado', async () => {
    respondWith(200, listings);
    await render();

    const cards = element.querySelectorAll('.listing-card');
    expect(cards).toHaveSize(3);
    expect(cards[0].textContent).toContain('Cabaña del Bosque');
    expect(cards[0].textContent).toContain('Guatapé');
    expect(cards[0].textContent).toContain('320.000');
    expect(cards[0].querySelector('.status-badge')?.textContent?.trim()).toBe('Borrador');
  });

  it('CA1: un borrador sin ciudad ni precio indica que están pendientes', async () => {
    respondWith(200, listings);
    await render();

    const draft = element.querySelectorAll('.listing-card')[2];
    expect(draft.textContent).toContain('Ciudad pendiente');
    expect(draft.textContent).toContain('Precio pendiente');
  });

  it('CA2: muestra el motivo del administrador en publicaciones devueltas o bloqueadas', async () => {
    respondWith(200, listings);
    await render();

    const reasons = element.querySelectorAll('.admin-reason');
    expect(reasons).toHaveSize(2);
    expect(reasons[0].textContent).toContain('Devuelta por el administrador');
    expect(reasons[0].textContent).toContain('Las fotografías están oscuras.');
    expect(reasons[1].classList).toContain('blocked');
    expect(reasons[1].textContent).toContain('Fotografías que no corresponden al inmueble.');
  });

  it('filtra el listado por estado', async () => {
    respondWith(200, listings);
    await render();

    expect(component.filterOptions.map((option) => option.label)).toEqual(['Todas', 'Borrador', 'Bloqueada']);
    component.filter = 'BLOQUEADA';
    expect(component.visibleListings.map((item) => item.id)).toEqual(['listing-2']);
  });

  it('sin publicaciones invita a crear la primera', async () => {
    respondWith(200, []);
    await render();

    expect(element.querySelector('.empty-state')?.textContent).toContain('Aún no tienes publicaciones');
  });

  it('informa cuando la sesión expiró', async () => {
    respondWith(401, {});
    await render();

    expect(component.errorMessage).toContain('Tu sesión expiró');
    expect(element.querySelector('.listing-card')).toBeNull();
  });

  describe('HU-013 · Solicitar la activación', () => {
    const draft = listings[0];

    it('CA1: los borradores ofrecen solicitar activación y las bloqueadas una nueva revisión (HU-051 CA4)', async () => {
      respondWith(200, listings);
      await render();

      const cards = element.querySelectorAll('.listing-card');
      expect(cards[0].querySelector('.activate-btn')?.textContent?.trim()).toBe('Solicitar activación');
      expect(cards[1].querySelector('.activate-btn')?.textContent?.trim()).toBe('Solicitar nueva revisión');
    });

    it('HU-051 CA4: al pedir la nueva revisión la publicación bloqueada pasa a En revisión', async () => {
      const fetchSpy = respondWith(200, listings);
      await render();
      const blocked = listings[1];
      fetchSpy.and.resolveTo(
        new Response(JSON.stringify({ ...blocked, status: 'PENDIENTE_REVISION', statusLabel: 'En revisión', adminReason: undefined }), { status: 200 }),
      );

      await component.requestActivation(blocked);

      expect(fetchSpy).toHaveBeenCalledWith('/api/listings/listing-2/request-activation', jasmine.objectContaining({ method: 'PATCH' }));
      expect(component.listings[1].status).toBe('PENDIENTE_REVISION');
      expect(component.successMessage).toContain('nueva revisión');
    });

    it('CA1 y CA3: al aprobarse la solicitud la tarjeta pasa a En revisión', async () => {
      const fetchSpy = respondWith(200, listings);
      await render();
      fetchSpy.and.resolveTo(
        new Response(
          JSON.stringify({ ...draft, status: 'PENDIENTE_REVISION', statusLabel: 'En revisión', adminReason: undefined }),
          { status: 200 },
        ),
      );

      await component.requestActivation(draft);

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/listings/listing-1/request-activation',
        jasmine.objectContaining({ method: 'PATCH' }),
      );
      expect(component.listings[0].status).toBe('PENDIENTE_REVISION');
      expect(component.successMessage).toContain('se envió a revisión');
    });

    it('CA2: si faltan campos muestra la lista que devuelve el sistema', async () => {
      const fetchSpy = respondWith(200, listings);
      await render();
      fetchSpy.and.resolveTo(
        new Response(
          JSON.stringify({ statusCode: 400, missingFields: ['images'], missingFieldLabels: ['al menos una imagen'] }),
          { status: 400 },
        ),
      );

      await component.requestActivation(listings[2]);
      fixture.detectChanges();

      expect(component.activationErrors['listing-3']).toEqual({
        message: 'No se puede solicitar la activación. Completa estos campos:',
        missing: ['al menos una imagen'],
      });
      expect(element.querySelector('.activation-error li')?.textContent).toContain('al menos una imagen');
      expect(component.listings[2].status).toBe('BORRADOR');
    });
  });

  describe('HU-014 · Pausar y reactivar mi publicación', () => {
    const active: MyListing = {
      id: 'listing-4',
      title: 'Casa en Jardín',
      city: 'Jardín',
      pricePerNight: 180000,
      status: 'ACTIVA',
      statusLabel: 'Activa',
      isComplete: true,
      missingFields: [],
      createdAt: '2026-10-17T10:00:00.000Z',
    };
    const paused: MyListing = { ...active, id: 'listing-5', title: 'Loft pausado', status: 'PAUSADA', statusLabel: 'Pausada' };
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

    it('las activas ofrecen pausar y las pausadas reactivar, con el aviso de que no reciben reservas', async () => {
      respondWith(200, [active, paused]);
      await render();

      const cards = element.querySelectorAll('.listing-card');
      expect(cards[0].querySelector('.pause-btn')).not.toBeNull();
      expect(cards[0].querySelector('.reactivate-btn')).toBeNull();
      expect(cards[1].querySelector('.reactivate-btn')).not.toBeNull();
      expect(cards[1].querySelector('.paused-note')?.textContent).toContain('ni recibe reservas nuevas');
    });

    it('CA1 y CA3: pide confirmación, pausa y aclara que las reservas confirmadas se mantienen', async () => {
      const fetchSpy = respondWith(200, [active, paused]);
      await render();
      (element.querySelector('.pause-btn') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(element.querySelector('.confirm-box')?.textContent).toContain('Tus reservas confirmadas se mantienen');
      expect(fetchSpy.calls.count()).toBe(1);

      fetchSpy.and.resolveTo(json({ ...active, status: 'PAUSADA', statusLabel: 'Pausada' }));
      await component.pause(active);

      expect(fetchSpy).toHaveBeenCalledWith('/api/listings/listing-4/pause', jasmine.objectContaining({ method: 'PATCH' }));
      expect(component.listings[0].status).toBe('PAUSADA');
      expect(component.confirmPauseId).toBeNull();
      expect(component.successMessage).toContain('ya no aparece en las búsquedas');
      expect(component.successMessage).toContain('reservas confirmadas se mantienen');
    });

    it('CA2: reactiva la publicación pausada sin nueva revisión', async () => {
      const fetchSpy = respondWith(200, [active, paused]);
      await render();
      fetchSpy.and.resolveTo(json({ ...paused, status: 'ACTIVA', statusLabel: 'Activa' }));

      await component.reactivate(paused);

      expect(fetchSpy).toHaveBeenCalledWith('/api/listings/listing-5/reactivate', jasmine.objectContaining({ method: 'PATCH' }));
      expect(component.listings[1].status).toBe('ACTIVA');
      expect(component.successMessage).toContain('está activa de nuevo');
    });

    it('si el filtro queda vacío tras el cambio vuelve a «Todas»', async () => {
      const fetchSpy = respondWith(200, [active]);
      await render();
      component.filter = 'ACTIVA';
      fetchSpy.and.resolveTo(json({ ...active, status: 'PAUSADA', statusLabel: 'Pausada' }));

      await component.pause(active);

      expect(component.filter).toBe('TODAS');
    });

    it('muestra el error del API y no cambia la tarjeta', async () => {
      const fetchSpy = respondWith(200, [active]);
      await render();
      fetchSpy.and.resolveTo(json({ message: 'Solo puedes pausar una publicación activa (estado actual: Pausada)' }, 400));

      await component.pause(active);

      expect(component.activationErrors['listing-4'].message).toContain('Solo puedes pausar una publicación activa');
      expect(component.listings[0].status).toBe('ACTIVA');
      expect(component.successMessage).toBe('');
    });
  });
});
