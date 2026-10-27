import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BookingDetail, BookingDetailComponent } from './booking-detail.component';

describe('BookingDetailComponent · HU-033 Consultar el estado de mis reservas', () => {
  let fixture: ComponentFixture<BookingDetailComponent>;
  let component: BookingDetailComponent;

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const detail: BookingDetail = {
    id: 'booking-1',
    code: 'RES-1A2B3C4D',
    listingId: 'listing-1',
    listingTitle: 'Cabaña del Bosque',
    listingCity: 'Guatapé',
    checkIn: '2027-04-10',
    checkOut: '2027-04-13',
    guests: 3,
    nights: 3,
    nightlyRate: 250000,
    baseAmount: 750000,
    cleaningFee: 60000,
    additionalServices: [{ name: 'Desayuno', cost: 40000 }],
    serviceFeePercentage: 10,
    serviceFee: 85000,
    totalAmount: 935000,
    currency: 'COP',
    status: 'CONFIRMADA',
    cancellationPolicyName: 'Flexible',
    cancellationPolicyDescription: 'Reembolso del 100 % si cancelas hasta 48 horas antes de la llegada y del 50 % después.',
  };
  const text = () => ((fixture.nativeElement as HTMLElement).textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    sessionStorage.setItem('auth_session', JSON.stringify({ token: 'jwt-guest', role: 'HUESPED', expiresAt: Date.now() + 3_600_000 }));
    await TestBed.configureTestingModule({
      imports: [BookingDetailComponent],
      providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } }],
    }).compileComponents();
    fixture = TestBed.createComponent(BookingDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sessionStorage.clear());

  it('CA1: muestra alojamiento, fechas, huéspedes, desglose, política y estado', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(detail));

    await component.load('booking-1');
    fixture.detectChanges();

    expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/bookings/booking-1');
    const page = text();
    expect(page).toContain('Cabaña del Bosque');
    expect(page).toContain('Guatapé');
    expect(page).toContain('3 huéspedes');
    expect(page).toContain('3 noches');
    expect(page).toContain('Desayuno');
    expect(page).toContain('Tarifa de servicio (10 %)');
    expect(page).toContain('Política de cancelación: Flexible');
    expect(page).toContain('CONFIRMADA');
    expect(page).toContain('pagada');
  });

  it('CA2: si la reserva es de otro huésped, lo indica sin mostrar datos', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ message: 'Esta reserva es de otro huésped' }, 403));

    await component.load('booking-ajena');
    fixture.detectChanges();

    expect(component.booking).toBeNull();
    expect(text()).toContain('Esta reserva es de otro huésped. Solo puedes consultar tus reservas.');
  });

  it('indica cuando la reserva no existe', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ message: 'no encontrada' }, 404));
    await component.load('no-existe');
    expect(component.errorMessage).toBe('No encontramos esta reserva.');
  });

  it('muestra el registro de una reserva cancelada', async () => {
    spyOn(window, 'fetch').and.returnValue(
      json({ ...detail, status: 'CANCELADA', cancellation: { cancelledAt: '2027-04-01T15:00:00Z', reason: 'Viaje aplazado', refundAmount: 850000, refundPercentage: 100 } }),
    );
    await component.load('booking-1');
    fixture.detectChanges();
    expect(text()).toContain('Motivo: Viaje aplazado');
    expect(text()).toContain('(100 %)');
  });
});
