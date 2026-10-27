import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiBooking, arrivalTime, estimateRefund, MyBookingsComponent, toBooking } from './my-bookings.component';

describe('MyBookingsComponent · HU-034 · HU-040 · HU-041', () => {
  let component: MyBookingsComponent;
  let fixture: ComponentFixture<MyBookingsComponent>;

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const apiBooking = (overrides: Partial<ApiBooking> = {}): ApiBooking => ({
    id: 'booking-1',
    listingId: 'listing-1',
    guestId: 'huesped@stayhub.com',
    checkIn: day(20),
    checkOut: day(23),
    guests: 2,
    nights: 3,
    nightlyRate: 300000,
    baseAmount: 900000,
    cleaningFee: 50000,
    serviceFee: 95000,
    totalAmount: 1045000,
    status: 'CONFIRMADA',
    listingTitle: 'Cabaña del Bosque',
    listingCity: 'Guatapé',
    listingImage: 'https://img.example/cabana.jpg',
    cancellationPolicyName: 'Flexible',
    ...overrides,
  });

  beforeEach(async () => {
    sessionStorage.setItem('auth_session', JSON.stringify({ token: 'jwt-guest', role: 'HUESPED', expiresAt: Date.now() + 3_600_000 }));
    await TestBed.configureTestingModule({ imports: [MyBookingsComponent] }).compileComponents();
    fixture = TestBed.createComponent(MyBookingsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sessionStorage.clear());

  it('carga las reservas del huésped desde el API con los datos de su publicación', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json([apiBooking(), apiBooking({ id: 'booking-2', status: 'PENDIENTE' })]));

    await component.loadBookings();

    expect(fetchSpy.calls.mostRecent().args[0]).toBe('/api/bookings/my');
    expect(component.bookings).toHaveSize(2);
    expect(component.bookings[0]).toEqual(jasmine.objectContaining({ listingTitle: 'Cabaña del Bosque', listingCity: 'Guatapé', total: 1045000 }));
    component.setStatusFilter('PENDIENTE');
    expect(component.filteredBookings.map((item) => item.id)).toEqual(['booking-2']);
  });

  it('HU-040 CA1: cancela en el API y muestra la reserva CANCELADA con su devolución', async () => {
    component.bookings = [toBooking(apiBooking())];
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(
      json(
        apiBooking({
          status: 'CANCELADA',
          listingTitle: undefined,
          cancellation: { cancelledAt: new Date().toISOString(), reason: 'Motivos médicos o de salud', refundAmount: 950000, refundPercentage: 100, releasedNights: [day(20)] },
        }),
      ),
    );

    component.openCancellationModal(component.bookings[0]);
    component.cancellationReason = 'Motivos médicos o de salud';
    await component.confirmCancellation();

    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toBe('/api/bookings/booking-1/cancel');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ reason: 'Motivos médicos o de salud' });
    expect(component.bookings[0]).toEqual(
      jasmine.objectContaining({ status: 'CANCELADA', refundAmount: 950000, refundPercentage: 100, listingTitle: 'Cabaña del Bosque' }),
    );
    expect(component.feedbackIsError).toBeFalse();
    expect(component.cancellingBooking).toBeNull();
  });

  it('HU-040 CA2: no ofrece cancelar si la llegada ya pasó y muestra el rechazo del API', async () => {
    const past = toBooking(apiBooking({ checkIn: day(-1), checkOut: day(2) }));
    expect(component.canCancel(past)).toBeFalse();
    expect(component.canCancel(toBooking(apiBooking()))).toBeTrue();

    component.bookings = [toBooking(apiBooking())];
    spyOn(window, 'fetch').and.returnValue(json({ message: 'La fecha de llegada ya pasó; la reserva no se puede cancelar' }, 400));
    component.openCancellationModal(component.bookings[0]);
    await component.confirmCancellation();

    expect(component.feedbackIsError).toBeTrue();
    expect(component.feedbackMessage).toContain('ya pasó');
    expect(component.bookings[0].status).toBe('CONFIRMADA');
  });

  it('HU-039 y HU-041 (CA1, CA2, CA3): calcula la devolución sin tarifa de servicio (650.000 COP a 5 días y 325.000 COP a 24 h) y muestra la regla aplicada en el detalle', () => {
    const booking715 = { checkIn: '2027-03-10', total: 715000, serviceFee: 65000 };
    const arrival = arrivalTime('2027-03-10');

    // CA1: 5 días antes -> 650.000 COP (100 % sin la tarifa de servicio)
    expect(estimateRefund(booking715, arrival - 5 * 24 * 3_600_000)).toEqual({
      percentage: 100,
      amount: 650000,
      appliedRule: 'Política Flexible: 100 % de devolución (sin la tarifa de servicio) por cancelar al menos 48 h antes de la llegada',
    });

    // CA2: 24 horas antes -> 325.000 COP (50 %)
    expect(estimateRefund(booking715, arrival - 24 * 3_600_000)).toEqual({
      percentage: 50,
      amount: 325000,
      appliedRule: 'Política Flexible: 50 % de devolución (sin la tarifa de servicio) por cancelar con menos de 48 h de anticipación a la llegada',
    });

    // CA3: en el detalle de la cancelación se muestran el valor devuelto y la regla aplicada
    const cancelled = toBooking(
      apiBooking({
        totalAmount: 715000,
        serviceFee: 65000,
        status: 'CANCELADA',
        cancellation: {
          cancelledAt: new Date().toISOString(),
          reason: 'Imprevisto',
          refundAmount: 325000,
          refundPercentage: 50,
          appliedRule: 'Política Flexible: 50 % de devolución (sin la tarifa de servicio) por cancelar con menos de 48 h de anticipación a la llegada',
          releasedNights: [day(20)],
        },
      }),
    );
    component.bookings = [cancelled];
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(html).toContain('325,000');
    expect(html).toContain('Política Flexible: 50 % de devolución (sin la tarifa de servicio)');
  });

  it('CA4: permite calificar de 1 a 5 estrellas y reseñar una reserva COMPLETADA (RF-063)', () => {
    const completed = toBooking(apiBooking({ id: 'booking-3', status: 'COMPLETADA' }));
    component.bookings = [completed];

    component.setTempRating(completed.id, 5);
    component.tempComments[completed.id] = 'Excelente servicio y comodidades.';
    component.submitReview(completed);

    expect(completed.rating).toBe(5);
    expect(completed.reviewComment).toBe('Excelente servicio y comodidades.');
    expect(component.feedbackIsError).toBeFalse();
  });
});
