import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiBooking, arrivalTime, estimateRefund, isReviewWindowOpen, MyBookingsComponent, reviewDeadline, toBooking } from './my-bookings.component';

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

  it('HU-047 CA1: publica en el API la calificación de 1 a 5 y la reseña de una reserva COMPLETADA (RF-063)', async () => {
    const completed = toBooking(apiBooking({ id: 'booking-3', status: 'COMPLETADA', checkIn: day(-5), checkOut: day(-2) }));
    component.bookings = [completed];
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(
      json({ id: 'review-1', bookingId: 'booking-3', rating: 5, comment: 'Excelente servicio y comodidades.', createdAt: '2026-11-06T02:00:00Z' }, 201),
    );

    expect(component.canReview(completed)).toBeTrue();
    component.setTempRating(completed.id, 5);
    component.tempComments[completed.id] = '  Excelente servicio y comodidades.  ';
    await component.submitReview(completed);

    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toBe('/api/reviews');
    expect(JSON.parse(String(init.body))).toEqual({ bookingId: 'booking-3', rating: 5, comment: 'Excelente servicio y comodidades.' });
    expect(completed.rating).toBe(5);
    // 6 de noviembre a las 02:00 UTC es 5 de noviembre en Colombia.
    expect(completed.reviewedAt).toBe('2026-11-05');
    expect(component.canReview(completed)).toBeFalse();
    expect(component.feedbackIsError).toBeFalse();
  });

  it('HU-047 CA2 y CA3: muestra el motivo cuando el API rechaza la reseña', async () => {
    const completed = toBooking(apiBooking({ id: 'booking-3', status: 'COMPLETADA', checkIn: day(-5), checkOut: day(-2) }));
    spyOn(window, 'fetch').and.returnValue(json({ message: 'Ya reseñaste esta estancia', reason: 'RESENA_DUPLICADA' }, 409));

    component.setTempRating(completed.id, 4);
    component.tempComments[completed.id] = 'Muy bien';
    await component.submitReview(completed);

    expect(completed.rating).toBeUndefined();
    expect(component.feedbackIsError).toBeTrue();
    expect(component.feedbackMessage).toBe('Ya reseñaste esta estancia');
  });

  it('HU-047 CA2 y CA4: no ofrece reseñar reservas no completadas ni pasado el plazo de 30 días', () => {
    const confirmed = toBooking(apiBooking({ status: 'CONFIRMADA' }));
    const expired = toBooking(apiBooking({ id: 'old', status: 'COMPLETADA', checkIn: day(-40), checkOut: day(-35) }));
    const reviewed = toBooking(apiBooking({ id: 'r', status: 'COMPLETADA', checkIn: day(-5), checkOut: day(-2), review: { id: 'review-1', rating: 4, comment: 'Bien', createdAt: '2026-11-01T10:00:00Z' } }));

    expect(component.canReview(confirmed)).toBeFalse();
    expect(component.canReview(expired)).toBeFalse();
    expect(component.canReview(reviewed)).toBeFalse();
    expect(reviewed.rating).toBe(4);

    component.bookings = [expired];
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('El plazo para reseñar esta estancia venció');
  });

  it('HU-047 CA4: el plazo termina 30 días después de la salida, en hora de Colombia', () => {
    expect(reviewDeadline('2026-10-06')).toBe('2026-11-05');
    expect(isReviewWindowOpen('2026-10-06', Date.parse('2026-11-06T04:30:00Z'))).toBeTrue();
    expect(isReviewWindowOpen('2026-10-06', Date.parse('2026-11-06T05:30:00Z'))).toBeFalse();
  });

  it('HU-034 CA1: muestra reservas pasadas y futuras ordenadas por fecha de llegada con filtro por estado', () => {
    const past = toBooking(apiBooking({ id: 'b-past', checkIn: '2025-02-10', status: 'COMPLETADA' }));
    const future1 = toBooking(apiBooking({ id: 'b-future-1', checkIn: '2027-01-15', status: 'CONFIRMADA' }));
    const future2 = toBooking(apiBooking({ id: 'b-future-2', checkIn: '2027-08-20', status: 'CONFIRMADA' }));
    const pending = toBooking(apiBooking({ id: 'b-pending', checkIn: '2026-12-01', status: 'PENDIENTE' }));

    // Desordenadas en bookings
    component.bookings = [future2, past, pending, future1];

    // Se ven ordenadas por fecha de llegada cronológicamente
    expect(component.filteredBookings.map((b) => b.id)).toEqual(['b-past', 'b-pending', 'b-future-1', 'b-future-2']);

    // Filtro por estado
    component.setStatusFilter('CONFIRMADA');
    expect(component.filteredBookings.map((b) => b.id)).toEqual(['b-future-1', 'b-future-2']);

    component.setStatusFilter('COMPLETADA');
    expect(component.filteredBookings.map((b) => b.id)).toEqual(['b-past']);
  });

  it('HU-034 CA2: cuando hay muchas reservas, las muestra paginadas y navega entre páginas', () => {
    const manyBookings = Array.from({ length: 12 }, (_, i) => {
      const idx = i + 1;
      const dayStr = idx < 10 ? `0${idx}` : `${idx}`;
      return toBooking(apiBooking({ id: `item-${idx}`, checkIn: `2027-03-${dayStr}` }));
    });

    component.bookings = manyBookings;
    component.pageSize = 5;
    component.currentPage = 1;

    expect(component.totalPages).toBe(3);
    expect(component.paginatedBookings).toHaveSize(5);
    expect(component.paginatedBookings[0].id).toBe('item-1');
    expect(component.paginatedBookings[4].id).toBe('item-5');

    // Navegación a página 2
    component.goToPage(2);
    expect(component.currentPage).toBe(2);
    expect(component.paginatedBookings).toHaveSize(5);
    expect(component.paginatedBookings[0].id).toBe('item-6');

    // Navegación a página 3 (última)
    component.goToPage(3);
    expect(component.currentPage).toBe(3);
    expect(component.paginatedBookings).toHaveSize(2);
    expect(component.paginatedBookings[0].id).toBe('item-11');
    expect(component.paginatedBookings[1].id).toBe('item-12');
  });
});
