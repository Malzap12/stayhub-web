import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HostBookingDetailComponent } from './host-booking-detail.component';
import { TestCardPaymentComponent } from './test-card-payment.component';
import { StayQuoteComponent } from '../listings/stay-quote.component';
import { decisionErrorMessage, HOST_BOOKING_FILTERS, HostBookingDetail } from '../../shared/models/host-booking.model';
import { statusText } from '../../shared/models/display.model';
import { clearActiveSession, saveActiveSession } from '../../core/guards/auth.guard';

describe('HU-036 · Aprobar o rechazar solicitudes de reserva', () => {
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const session = (role: string) =>
    saveActiveSession({ token: `jwt-${role}`, email: `${role}@stayhub.com`, name: role, role, expiresAt: Date.now() + 60_000 } as never);
  const card = { cardNumber: '4242424242424242', cardHolder: 'Ana', expMonth: 12, expYear: 2030, cvc: '123' };

  afterEach(() => clearActiveSession());

  describe('Detalle de la solicitud para el anfitrión', () => {
    let fixture: ComponentFixture<HostBookingDetailComponent>;
    let component: HostBookingDetailComponent;
    const pending = (): HostBookingDetail => ({
      id: 'booking-1',
      code: 'RES-1A2B3C4D',
      listingId: 'listing-1',
      listingTitle: 'Cabaña en Salento',
      listingCity: 'Salento',
      checkIn: '2027-04-10',
      checkOut: '2027-04-13',
      nights: 3,
      guests: 2,
      guestName: 'Laura Gómez',
      status: 'PENDIENTE_APROBACION',
      totalAmount: 650000,
      currency: 'COP',
      createdAt: '2026-11-03T12:00:00Z',
      paymentCard: 'VISA ···· 4242',
    });
    const element = () => fixture.nativeElement as HTMLElement;
    const text = () => (element().textContent ?? '').replace(/\s+/g, ' ');

    beforeEach(async () => {
      session('ANFITRION');
      await TestBed.configureTestingModule({
        imports: [HostBookingDetailComponent],
        providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } }],
      }).compileComponents();
      fixture = TestBed.createComponent(HostBookingDetailComponent);
      component = fixture.componentInstance;
    });

    it('una solicitud por aprobar muestra Aceptar y Rechazar con la tarjeta que se cobrará', () => {
      component.booking = pending();
      fixture.detectChanges();

      expect(element().querySelector('.accept-btn')?.textContent?.trim()).toBe('Aceptar y cobrar');
      expect(element().querySelector('.reject-btn')?.textContent?.trim()).toBe('Rechazar');
      expect(text()).toContain('VISA ···· 4242');
      expect(text()).not.toContain('PENDIENTE_APROBACION');
    });

    it('una reserva confirmada no muestra la decisión', () => {
      component.booking = { ...pending(), status: 'CONFIRMADA' };
      fixture.detectChanges();

      expect(element().querySelector('.decision')).toBeNull();
    });

    it('CA1: al aceptar llama al API y muestra la reserva confirmada', async () => {
      component.booking = pending();
      const fetchSpy = spyOn(window, 'fetch').and.returnValues(
        json({ booking: { id: 'booking-1', status: 'CONFIRMADA' }, payment: { status: 'APROBADO', reference: 'TEST-1' } }),
        json({ ...pending(), status: 'CONFIRMADA', paymentCard: undefined }),
      );

      await component.accept();

      const [url, init] = fetchSpy.calls.first().args as [string, RequestInit];
      expect(url).toBe('/api/bookings/host/booking-1/accept');
      expect(init.method).toBe('PATCH');
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-ANFITRION');
      expect(component.successMessage).toBe('Aceptaste la solicitud: el pago se aprobó y la reserva quedó confirmada.');
      expect(component.booking?.status).toBe('CONFIRMADA');
    });

    it('CA1: si las fechas ya no están libres lo explica y no cambia la solicitud', async () => {
      component.booking = pending();
      spyOn(window, 'fetch').and.returnValue(json({ reason: 'PERIODO_NO_DISPONIBLE', message: 'El periodo ya no está disponible' }, 400));

      await component.accept();

      expect(component.decisionError).toContain('ya no están disponibles, así que no se cobró nada');
      expect(component.booking?.status).toBe('PENDIENTE_APROBACION');
    });

    it('CA1: si el pago se rechaza la solicitud sigue pendiente', async () => {
      component.booking = pending();
      spyOn(window, 'fetch').and.returnValue(
        json({ booking: { id: 'booking-1', status: 'PENDIENTE_APROBACION' }, payment: { status: 'RECHAZADO', message: 'Pago rechazado por el emisor' } }),
      );

      await component.accept();

      expect(component.decisionError).toContain('El pago con la tarjeta del huésped fue rechazado (Pago rechazado por el emisor)');
      expect(component.successMessage).toBe('');
    });

    it('CA2: rechaza con el motivo opcional y avisa que no se cobró', async () => {
      component.booking = pending();
      const fetchSpy = spyOn(window, 'fetch').and.returnValues(
        json({ id: 'booking-1', status: 'RECHAZADA' }),
        json({ ...pending(), status: 'RECHAZADA', rejectionReason: 'Esas fechas no recibo huéspedes.' }),
      );
      component.startRejecting();
      component.rejectReason = '  Esas fechas no recibo huéspedes. ';

      await component.reject();
      fixture.detectChanges();

      const [url, init] = fetchSpy.calls.first().args as [string, RequestInit];
      expect(url).toBe('/api/bookings/host/booking-1/reject');
      expect(JSON.parse(String(init.body))).toEqual({ reason: 'Esas fechas no recibo huéspedes.' });
      expect(component.successMessage).toBe('Rechazaste la solicitud. No se cobró nada y le avisamos al huésped.');
      expect(text()).toContain('Rechazada');
      expect(text()).toContain('«Esas fechas no recibo huéspedes.»');
    });

    it('CA2: sin motivo envía un cuerpo vacío', async () => {
      component.booking = pending();
      const fetchSpy = spyOn(window, 'fetch').and.returnValues(json({ status: 'RECHAZADA' }), json({ ...pending(), status: 'RECHAZADA' }));

      await component.reject();

      expect(JSON.parse(String((fetchSpy.calls.first().args[1] as RequestInit).body))).toEqual({});
    });
  });

  describe('Solicitud del huésped', () => {
    let component: StayQuoteComponent;

    beforeEach(async () => {
      session('HUESPED');
      await TestBed.configureTestingModule({ imports: [StayQuoteComponent], providers: [provideRouter([])] }).compileComponents();
      component = TestBed.createComponent(StayQuoteComponent).componentInstance;
      component.listingId = 'listing-1';
      component.checkIn = '2027-04-10';
      component.checkOut = '2027-04-13';
      component.bookingMode = 'CON_APROBACION';
    });

    it('antes de enviar la solicitud pide la tarjeta, sin llamar al API', async () => {
      const fetchSpy = spyOn(window, 'fetch');

      await component.startInstantBooking();

      expect(component.requestStep).toBeTrue();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('envía la solicitud con la tarjeta y queda esperando la aprobación', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.returnValue(
        json({ id: 'booking-1', status: 'PENDIENTE_APROBACION', savedPaymentMethod: { cardBrand: 'VISA', cardLast4: '4242' } }, 201),
      );
      component.requestStep = true;

      await component.startInstantBooking(card);

      expect(JSON.parse(String((fetchSpy.calls.mostRecent().args[1] as RequestInit).body)).card).toEqual(card);
      expect(component.requestedBooking.status).toBe('PENDIENTE_APROBACION');
      expect(component.requestStep).toBeFalse();
    });
  });

  describe('Formulario de tarjeta en modo guardar', () => {
    it('entrega la tarjeta sin cobrarla', async () => {
      await TestBed.configureTestingModule({ imports: [TestCardPaymentComponent] }).compileComponents();
      const component = TestBed.createComponent(TestCardPaymentComponent).componentInstance;
      const fetchSpy = spyOn(window, 'fetch');
      const emitted: unknown[] = [];
      component.mode = 'guardar';
      component.cardReady.subscribe((value) => emitted.push(value));
      component.onCardNumber('4242 4242 4242 4242');
      component.cardHolder = 'Ana';
      component.expMonth = 12;
      component.expYear = 2030;
      component.cvc = '123';

      await component.pay();

      expect(emitted).toEqual([card]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  it('textos de los estados y errores sin códigos internos', () => {
    expect(statusText('RECHAZADA')).toBe('Rechazada');
    expect(HOST_BOOKING_FILTERS.find((item) => item.value === 'RECHAZADA')?.label).toBe('Rechazadas');
    expect(decisionErrorMessage(409, { reason: 'SOLICITUD_NO_PENDIENTE' })).toBe('Esta solicitud ya no espera tu decisión.');
    expect(decisionErrorMessage(404, {})).toBe('No encontramos esta solicitud entre las de tus alojamientos.');
  });
});
