import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HostBookingsComponent } from './host-bookings.component';
import { HostListingBookings } from '../../shared/models/host-booking.model';

describe('HostBookingsComponent · HU-035 Reservas recibidas', () => {
  let fixture: ComponentFixture<HostBookingsComponent>;
  let component: HostBookingsComponent;

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const groups: HostListingBookings[] = [
    {
      listingId: 'listing-1',
      listingTitle: 'Casa en Jardín',
      listingCity: 'Jardín',
      bookings: [
        {
          id: 'booking-1',
          code: 'RES-1A2B3C4D',
          checkIn: '2027-01-10',
          checkOut: '2027-01-13',
          nights: 3,
          guests: 3,
          guestName: 'Laura Gómez',
          status: 'CONFIRMADA',
          totalAmount: 650000,
          currency: 'COP',
          createdAt: '2026-10-01T12:00:00Z',
        },
        {
          id: 'booking-2',
          checkIn: '2027-01-20',
          checkOut: '2027-01-21',
          nights: 1,
          guests: 1,
          guestName: 'Pedro Ruiz',
          status: 'PENDIENTE',
          totalAmount: 210000,
          currency: 'COP',
          createdAt: '2026-10-02T12:00:00Z',
        },
      ],
    },
    { listingId: 'listing-2', listingTitle: 'Loft en Laureles', listingCity: 'Medellín', bookings: [] },
  ];
  groups[1].bookings = [{ ...groups[0].bookings[0], id: 'booking-3', guestName: 'Sara Mejía', status: 'EN_REVISION' }];
  const text = () => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    sessionStorage.setItem('stayhub_session', JSON.stringify({ token: 'jwt-host', role: 'ANFITRION', name: 'Ana', expiresAt: Date.now() + 3_600_000 }));
    await TestBed.configureTestingModule({ imports: [HostBookingsComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(HostBookingsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sessionStorage.clear());

  it('CA1: muestra por alojamiento las fechas, el huésped, el número de huéspedes y el estado', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(groups));

    await component.load();
    fixture.detectChanges();

    expect(fetchSpy).toHaveBeenCalledWith('/api/bookings/host', jasmine.objectContaining({ headers: { Authorization: 'Bearer jwt-host' } }));
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.listing-group').length).toBe(2);
    const first = element.querySelectorAll('.listing-group')[0];
    expect(first.querySelector('h2')?.textContent).toContain('Casa en Jardín');
    const row = first.querySelectorAll('.booking-row')[0];
    expect(row.querySelector('.guest-name')?.textContent).toContain('Laura Gómez');
    expect(row.querySelector('.guest-meta')?.textContent).toContain('3 huéspedes · 3 noches');
    expect(row.querySelector('.dates')?.textContent).toContain('2027');
    expect(row.querySelector('.status-badge')?.textContent?.trim()).toBe('Confirmada');
    expect(first.querySelectorAll('.booking-row')[1].querySelector('.guest-meta')?.textContent).toContain('1 huésped · 1 noche');
    expect(text()).toContain('3 reservas en 2 alojamientos');
  });

  it('muestra los estados con nombres legibles, sin códigos internos', async () => {
    spyOn(window, 'fetch').and.returnValue(json(groups));

    await component.load();
    fixture.detectChanges();

    expect(text()).toContain('Pendiente de pago');
    expect(text()).toContain('En revisión');
    expect(text()).not.toMatch(/PENDIENTE|CONFIRMADA|EN_REVISION|\b(HU|RF|RN)-\d/);
  });

  it('cada reserva enlaza a su detalle', async () => {
    spyOn(window, 'fetch').and.returnValue(json(groups));

    await component.load();
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('.detail-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/anfitrion/reservas/booking-1');
  });

  it('filtra por estado consultando al API', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json([]));

    await component.setFilter('CONFIRMADA');
    fixture.detectChanges();

    expect(fetchSpy).toHaveBeenCalledWith('/api/bookings/host?status=CONFIRMADA', jasmine.anything());
    expect(text()).toContain('No hay reservas con este estado.');
  });

  it('sin reservas muestra un mensaje que lo explica', async () => {
    spyOn(window, 'fetch').and.returnValue(json([]));

    await component.load();
    fixture.detectChanges();

    expect(text()).toContain('Aún no tienes reservas.');
  });

  it('muestra el error del API', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ message: 'Acceso denegado' }, 403));

    await component.load();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Acceso denegado');
    expect(component.groups).toEqual([]);
  });
});
