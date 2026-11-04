import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HostBookingDetailComponent } from './host-booking-detail.component';
import { HostBookingDetail } from '../../shared/models/host-booking.model';

describe('HostBookingDetailComponent · HU-035 y HU-042 Detalle y cancelación de reserva recibida', () => {
  let fixture: ComponentFixture<HostBookingDetailComponent>;
  let component: HostBookingDetailComponent;

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const confirmed: HostBookingDetail = {
    id: 'booking-1',
    code: 'RES-1A2B3C4D',
    listingId: 'listing-1',
    listingTitle: 'Casa en Jardín',
    listingCity: 'Jardín',
    checkIn: '2027-04-10',
    checkOut: '2027-04-13',
    nights: 3,
    guests: 3,
    guestName: 'Laura Gómez',
    status: 'CONFIRMADA',
    totalAmount: 650000,
    currency: 'COP',
    createdAt: '2026-10-01T12:00:00Z',
    specialRequests: 'Llegamos en la noche',
    additionalServices: [{ name: 'Desayuno', cost: 40000 }],
    guestContact: { name: 'Laura Gómez', email: 'laura@prueba.com', phone: '300 555 1234' },
  };
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => (element().textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    sessionStorage.setItem('stayhub_session', JSON.stringify({ token: 'jwt-host', role: 'ANFITRION', name: 'Ana', expiresAt: Date.now() + 3_600_000 }));
    await TestBed.configureTestingModule({
      imports: [HostBookingDetailComponent],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } }],
    }).compileComponents();
    fixture = TestBed.createComponent(HostBookingDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sessionStorage.clear());

  it('CA2 (HU-035): con la reserva confirmada muestra el contacto del huésped y no expone códigos internos', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(confirmed));

    await component.load('booking-1');
    fixture.detectChanges();

    expect(fetchSpy).toHaveBeenCalledWith('/api/bookings/host/booking-1', jasmine.objectContaining({ headers: { Authorization: 'Bearer jwt-host' } }));
    const links = Array.from(element().querySelectorAll('.contact-card a')).map((link) => link.getAttribute('href'));
    expect(links).toEqual(['mailto:laura@prueba.com', 'tel:3005551234']);
    expect(text()).toContain('Laura Gómez');
    expect(text()).toContain('3 huéspedes');
    expect(text()).toContain('Llegamos en la noche');
    expect(text()).toContain('Desayuno');
    expect(text()).toContain('Confirmada');
    expect(text()).not.toMatch(/CONFIRMADA|CANCELADA|\b(HU|RF|RN|RNF)-\d/);
  });

  it('sin teléfono registrado lo indica', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ ...confirmed, guestContact: { name: 'Laura Gómez', email: 'laura@prueba.com' } }));

    await component.load('booking-1');
    fixture.detectChanges();

    expect(text()).toContain('El huésped no registró un teléfono.');
  });

  it('si la reserva no está confirmada oculta el contacto y la acción de cancelar', async () => {
    const { guestContact: _omitted, ...rest } = confirmed;
    spyOn(window, 'fetch').and.returnValue(json({ ...rest, status: 'PENDIENTE' }));

    await component.load('booking-1');
    fixture.detectChanges();

    expect(element().querySelector('.contact-card a')).toBeNull();
    expect(element().querySelector('.cancel-action-card')).toBeNull();
    expect(text()).toContain('Los datos de contacto se muestran cuando la reserva está confirmada.');
    expect(text()).toContain('Pendiente de pago');
  });

  it('una reserva de otro anfitrión muestra que no se encontró', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ message: 'Reserva con id x no encontrada' }, 404));

    await component.load('x');
    fixture.detectChanges();

    expect(component.booking).toBeNull();
    expect(text()).toContain('No encontramos esta reserva entre las de tus alojamientos.');
  });

  describe('HU-042 · Cancelar una reserva como anfitrión', () => {
    it('CA1 y CA2: cancela una reserva confirmada con motivo, muestra devolución del 100 % y estado cancelada', async () => {
      const cancelledResponse: HostBookingDetail = {
        ...confirmed,
        status: 'CANCELADA',
        guestContact: undefined,
        cancellation: {
          cancelledAt: '2026-11-04T02:00:00.000Z',
          reason: 'Daño eléctrico en la propiedad',
          policy: 'CANCELACION_ANFITRION',
          refundPercentage: 100,
          refundableAmount: 650000,
          refundAmount: 650000,
          appliedRule: 'Cancelación por el anfitrión: devolución del 100 % del total pagado, incluida la tarifa de servicio',
          currency: 'COP',
          finalStatus: 'CANCELADA',
          releasedNights: ['2027-04-10', '2027-04-11', '2027-04-12'],
        },
      };

      const fetchSpy = spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'PATCH') {
          return json(cancelledResponse, 200);
        }
        return json(confirmed, 200);
      });

      await component.load('booking-1');
      fixture.detectChanges();

      expect(text()).toContain('100 % del total');
      component.openCancelForm();
      fixture.detectChanges();

      // Exige motivo de al menos 3 caracteres antes de enviar
      component.cancelReason = '  ';
      await component.submitCancellation();
      fixture.detectChanges();
      expect(component.cancelError).toContain('mínimo 3 caracteres');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      component.cancelReason = '  Daño eléctrico en la propiedad  ';
      await component.submitCancellation();
      fixture.detectChanges();

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/bookings/host/booking-1/cancel',
        jasmine.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ reason: 'Daño eléctrico en la propiedad' }),
        }),
      );
      expect(component.booking?.status).toBe('CANCELADA');
      expect(text()).toContain('Cancelada');
      expect(text()).toContain('Detalle de la cancelación');
      expect(text()).toContain('Daño eléctrico en la propiedad');
      expect(text()).toContain('100 %');
      expect(text()).toContain('Se notificó al huésped');
      expect(text()).not.toMatch(/CONFIRMADA|CANCELADA|\b(HU|RF|RN|RNF)-\d/);
    });

    it('impide cancelar en la interfaz cuando la fecha de llegada ya pasó', async () => {
      spyOn(window, 'fetch').and.returnValue(json({ ...confirmed, checkIn: '2025-01-01', checkOut: '2025-01-03' }));

      await component.load('booking-1');
      fixture.detectChanges();

      expect(text()).toContain('La fecha de llegada ya pasó; esta reserva no se puede cancelar.');
      expect(element().querySelector('.cancel-action-card button')).toBeNull();
    });

    it('muestra el mensaje de error si el servidor rechaza la cancelación', async () => {
      spyOn(window, 'fetch').and.callFake((_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'PATCH') {
          return json({ message: 'Solo se pueden cancelar reservas confirmadas' }, 400);
        }
        return json(confirmed, 200);
      });

      await component.load('booking-1');
      component.openCancelForm();
      component.cancelReason = 'Mantenimiento urgente';
      await component.submitCancellation();
      fixture.detectChanges();

      expect(component.cancelError).toBe('Solo se pueden cancelar reservas confirmadas');
      expect(component.booking?.status).toBe('CONFIRMADA');
    });
  });
});
