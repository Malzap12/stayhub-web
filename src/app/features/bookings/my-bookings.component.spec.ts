import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyBookingsComponent } from './my-bookings.component';

describe('MyBookingsComponent · HU-034', () => {
  let component: MyBookingsComponent;
  let fixture: ComponentFixture<MyBookingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyBookingsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MyBookingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('CA1: debe listar reservas y permitir filtrar por estado (RF-048)', () => {
    expect(component.bookings.length).toBe(5);

    component.setStatusFilter('CONFIRMADA');
    expect(component.filteredBookings.length).toBe(1);
    expect(component.filteredBookings[0].status).toBe('CONFIRMADA');

    component.setStatusFilter('COMPLETADA');
    expect(component.filteredBookings.length).toBe(1);
    expect(component.filteredBookings[0].status).toBe('COMPLETADA');
  });

  it('CA2: debe soportar búsqueda por ciudad o ID y paginar resultados (RNF-022)', () => {
    component.searchQuery = 'Cartagena';
    component.onSearchChange();
    expect(component.filteredBookings.length).toBe(1);
    expect(component.filteredBookings[0].listingCity).toBe('Cartagena');

    component.searchQuery = '';
    component.pageSize = 2;
    expect(component.totalPages).toBe(3);
    expect(component.paginatedBookings.length).toBe(2);

    component.goToPage(2);
    expect(component.currentPage).toBe(2);
  });

  it('CA3: al cancelar una reserva CONFIRMADA calcula devolución simulada y pasa a CANCELADA (RF-053, RF-054)', () => {
    const target = component.bookings.find((b) => b.id === 'LR-RSV-2026-8812');
    expect(target).toBeDefined();

    component.openCancellationModal(target!);
    component.cancellationReason = 'Cambio imprevisto de itinerario';
    component.confirmCancellation();

    expect(target!.status).toBe('CANCELADA');
    expect(target!.refundAmount).toBe(target!.total - target!.serviceFee);
    expect(target!.cancellationReason).toBe('Cambio imprevisto de itinerario');
  });

  it('CA4: permite calificar de 1 a 5 estrellas y reseñar una reserva COMPLETADA (RF-063)', () => {
    const completed = component.bookings.find((b) => b.id === 'LR-RSV-2026-7201');
    expect(completed).toBeDefined();

    component.setTempRating(completed!.id, 5);
    component.tempComments[completed!.id] = 'Excelente servicio y comodidades.';
    component.submitReview(completed!);

    expect(completed!.rating).toBe(5);
    expect(completed!.reviewComment).toBe('Excelente servicio y comodidades.');
    expect(component.feedbackIsError).toBeFalse();
  });
});
