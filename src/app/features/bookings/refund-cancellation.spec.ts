import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyBookingsComponent } from './my-bookings.component';
import { BookingDetailComponent } from './booking-detail.component';
import { SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';
import { ActivatedRoute } from '@angular/router';

describe('HU-038 · Reflejar la devolución en el proveedor de pruebas (CA1 · RF-081, RN-030)', () => {
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  beforeEach(() => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token: 'jwt-guest',
        email: 'huesped@stayhub.com',
        name: 'Huésped',
        role: 'HUESPED',
        expiresAt: Date.now() + 60_000,
      }),
    );
  });

  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  describe('MyBookingsComponent', () => {
    let fixture: ComponentFixture<MyBookingsComponent>;
    let component: MyBookingsComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [MyBookingsComponent],
      }).compileComponents();
      fixture = TestBed.createComponent(MyBookingsComponent);
      component = fixture.componentInstance;
    });

    it('CA1 · Muestra la referencia del reembolso emitida por el proveedor de pruebas al cancelar una reserva con devolución', async () => {
      const mockBooking = {
        id: 'book-hu038',
        listingId: 'list-1',
        guestId: 'huesped@stayhub.com',
        checkIn: '2027-05-01',
        checkOut: '2027-05-05',
        guests: 2,
        totalAmount: 1_000_000,
        serviceFee: 100_000,
        currency: 'COP',
        status: 'CANCELADA',
        listingTitle: 'Cabaña Reflejo',
        listingCity: 'Guatapé',
        cancellation: {
          cancelledAt: '2026-11-04T20:00:00Z',
          reason: 'Cambio de itinerario',
          refundAmount: 900_000,
          refundPercentage: 100,
          refundReference: 'REF-TEST-8A1C9E4B',
        },
      };

      spyOn(window, 'fetch').and.callFake(() => json([mockBooking]));

      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      const refEl = el.querySelector('.refund-reference');
      expect(refEl).toBeTruthy();
      expect(refEl?.textContent).toContain('REF-TEST-8A1C9E4B');
    });
  });

  describe('BookingDetailComponent', () => {
    let fixture: ComponentFixture<BookingDetailComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [BookingDetailComponent],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { paramMap: { get: () => 'book-hu038' } } },
          },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(BookingDetailComponent);
    });

    it('CA1 · Renderiza la referencia del reembolso en el detalle de la reserva', async () => {
      const mockDetail = {
        id: 'book-hu038',
        listingId: 'list-1',
        title: 'Cabaña Reflejo',
        city: 'Guatapé',
        checkIn: '2027-05-01',
        checkOut: '2027-05-05',
        status: 'CANCELADA',
        totalAmount: 1_000_000,
        cancellation: {
          cancelledAt: '2026-11-04T20:00:00Z',
          reason: 'Cambio de itinerario',
          refundAmount: 900_000,
          refundPercentage: 100,
          refundReference: 'REF-TEST-8A1C9E4B',
        },
      };

      spyOn(window, 'fetch').and.callFake(() => json(mockDetail));

      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('REF-TEST-8A1C9E4B');
    });
  });
});
