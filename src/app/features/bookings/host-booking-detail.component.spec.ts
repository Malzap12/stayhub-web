import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HostBookingDetailComponent } from './host-booking-detail.component';
import { HostBookingDetail } from '../../shared/models/host-booking.model';

describe('HostBookingDetailComponent · HU-035 Detalle de una reserva recibida', () => {
  let fixture: ComponentFixture<HostBookingDetailComponent>;
  let component: HostBookingDetailComponent;

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const confirmed: HostBookingDetail = {
    id: 'booking-1',
    code: 'RES-1A2B3C4D',
    listingId: 'listing-1',
    listingTitle: 'Casa en Jardín',
    listingCity: 'Jardín',
    checkIn: '2027-01-10',
    checkOut: '2027-01-13',
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

  it('CA2: con la reserva confirmada muestra el contacto del huésped', async () => {
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
    expect(text()).not.toContain('CONFIRMADA');
  });

  it('sin teléfono registrado lo indica', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ ...confirmed, guestContact: { name: 'Laura Gómez', email: 'laura@prueba.com' } }));

    await component.load('booking-1');
    fixture.detectChanges();

    expect(text()).toContain('El huésped no registró un teléfono.');
  });

  it('si la reserva no está confirmada oculta el contacto y explica cuándo aparece', async () => {
    const { guestContact: _omitted, ...rest } = confirmed;
    spyOn(window, 'fetch').and.returnValue(json({ ...rest, status: 'PENDIENTE' }));

    await component.load('booking-1');
    fixture.detectChanges();

    expect(element().querySelector('.contact-card a')).toBeNull();
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
});
