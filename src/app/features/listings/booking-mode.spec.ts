import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ListingDraftFormComponent } from './listing-draft-form.component';
import { MyListingsComponent } from './my-listings.component';
import { StayQuoteComponent } from './stay-quote.component';
import { clearActiveSession, saveActiveSession } from '../../core/guards/auth.guard';
import { MyListing } from '../../shared/models/listing.model';
import { bookingModeOption } from '../../shared/models/booking-mode.model';

describe('HU-018 · Elegir la modalidad de reserva', () => {
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const bodyOf = (spy: jasmine.Spy) => JSON.parse(spy.calls.mostRecent().args[1].body);
  const session = (role: string) =>
    saveActiveSession({ token: `jwt-${role}`, email: `${role}@stayhub.com`, name: role, role, expiresAt: Date.now() + 60_000 } as never);

  afterEach(() => clearActiveSession());

  describe('Formulario de la publicación', () => {
    let component: ListingDraftFormComponent;

    beforeEach(() => {
      session('ANFITRION');
      component = new ListingDraftFormComponent();
    });

    it('CA1: una publicación nueva se guarda con reserva inmediata por defecto', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.returnValue(json({ id: 'listing-1', status: 'BORRADOR' }, 201));
      component.form.title = 'Finca cafetera';

      await component.save();

      expect(component.form.bookingMode).toBe('INMEDIATA');
      expect(bodyOf(fetchSpy).bookingMode).toBe('INMEDIATA');
    });

    it('CA2: envía «con aprobación» cuando el anfitrión la elige', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.returnValue(json({ id: 'listing-1', status: 'BORRADOR' }, 201));
      component.form.title = 'Finca cafetera';
      component.form.bookingMode = 'CON_APROBACION';

      await component.save();

      expect(bodyOf(fetchSpy).bookingMode).toBe('CON_APROBACION');
    });

    it('al editar carga la modalidad guardada', async () => {
      spyOn(window, 'fetch').and.returnValue(json({ title: 'Finca cafetera', bookingMode: 'CON_APROBACION' }));

      await component.loadListingForEdit('listing-1');

      expect(component.form.bookingMode).toBe('CON_APROBACION');
    });
  });

  describe('Mis publicaciones', () => {
    let fixture: ComponentFixture<MyListingsComponent>;
    let component: MyListingsComponent;
    const listing = (): MyListing => ({
      id: 'listing-1',
      title: 'Finca cafetera',
      city: 'Manizales',
      pricePerNight: 180000,
      status: 'ACTIVA',
      statusLabel: 'Activa',
      bookingMode: 'INMEDIATA',
      isComplete: true,
      missingFields: [],
      createdAt: '2026-10-20T10:00:00.000Z',
    });

    beforeEach(async () => {
      session('ANFITRION');
      await TestBed.configureTestingModule({ imports: [MyListingsComponent], providers: [provideRouter([])] }).compileComponents();
      fixture = TestBed.createComponent(MyListingsComponent);
      component = fixture.componentInstance;
    });

    it('muestra la modalidad de cada publicación', () => {
      component.listings = [listing()];
      fixture.detectChanges();

      const card = (fixture.nativeElement as HTMLElement).querySelector('.listing-card')!;
      expect(card.querySelector('.booking-mode')?.textContent?.trim()).toBe('Reserva inmediata');
      expect(card.querySelector('.booking-mode-btn')?.textContent?.trim()).toBe('Cambiar a con aprobación →');
    });

    it('CA2: cambia a «con aprobación» y lo confirma', async () => {
      const item = listing();
      component.listings = [item];
      const fetchSpy = spyOn(window, 'fetch').and.returnValue(
        json({ listingId: 'listing-1', bookingMode: 'CON_APROBACION', message: 'Las nuevas solicitudes quedarán pendientes hasta que las apruebes.' }),
      );

      await component.switchBookingMode(item);

      expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/listings/listing-1/booking-mode');
      expect(bodyOf(fetchSpy)).toEqual({ mode: 'CON_APROBACION' });
      expect((fetchSpy.calls.mostRecent().args[1]?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
      expect(item.bookingMode).toBe('CON_APROBACION');
      expect(component.successMessage).toContain('ahora es con aprobación');
    });

    it('si falla, conserva la modalidad y explica el motivo', async () => {
      const item = listing();
      spyOn(window, 'fetch').and.returnValue(json({ message: 'No encontrada' }, 404));

      await component.switchBookingMode(item);

      expect(item.bookingMode).toBe('INMEDIATA');
      expect(component.activationErrors['listing-1'].message).toBe('La publicación no existe o no te pertenece.');
    });
  });

  describe('Reserva del huésped', () => {
    let fixture: ComponentFixture<StayQuoteComponent>;
    let component: StayQuoteComponent;

    beforeEach(async () => {
      session('HUESPED');
      await TestBed.configureTestingModule({ imports: [StayQuoteComponent], providers: [provideRouter([])] }).compileComponents();
      fixture = TestBed.createComponent(StayQuoteComponent);
      component = fixture.componentInstance;
      component.listingId = 'listing-1';
      component.checkIn = '2027-06-10';
      component.checkOut = '2027-06-13';
    });

    it('CA2: con aprobación envía una solicitud que queda esperando al anfitrión, sin paso de pago', async () => {
      component.bookingMode = 'CON_APROBACION';
      spyOn(window, 'fetch').and.returnValue(json({ id: 'booking-1', code: 'RES-1A2B3C4D', status: 'PENDIENTE_APROBACION' }, 201));

      await component.startInstantBooking();

      expect(component.requestedBooking.code).toBe('RES-1A2B3C4D');
      expect(component.createdBooking).toBeNull();
    });

    it('en modalidad inmediata sigue al pago como antes', async () => {
      spyOn(window, 'fetch').and.returnValue(json({ id: 'booking-2', status: 'PENDIENTE' }, 201));

      await component.startInstantBooking();

      expect(component.createdBooking.id).toBe('booking-2');
      expect(component.requestedBooking).toBeNull();
    });
  });

  it('una publicación sin modalidad se muestra como reserva inmediata', () => {
    expect(bookingModeOption(undefined).label).toBe('Reserva inmediata');
    expect(bookingModeOption('CON_APROBACION').guestDescription).toContain('No se te cobra nada hasta que la acepte');
  });
});
