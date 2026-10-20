import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminModerationComponent } from './admin-moderation.component';

describe('AdminModerationComponent · HU-050', () => {
  let component: AdminModerationComponent;
  let fixture: ComponentFixture<AdminModerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminModerationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminModerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('CA1: debe mostrar las publicaciones en PENDIENTE_REVISION ordenadas por fecha de solicitud', () => {
    const queue = component.pendingQueue;
    expect(queue.length).toBe(3);
    expect(queue[0].id).toBe('pending-listing-1');
    expect(queue[1].id).toBe('pending-listing-2');
    expect(queue[2].id).toBe('pending-listing-3');
  });

  it('CA2: al aprobar una publicación pendiente pasa a ACTIVA, aparece en búsquedas y se notifica al anfitrión', () => {
    component.approveListing('pending-listing-1');

    const approved = component.listings.find((l) => l.id === 'pending-listing-1');
    expect(approved?.status).toBe('ACTIVA');
    expect(component.activeSearchListings.some((l) => l.id === 'pending-listing-1')).toBeTrue();
    expect(component.notifications.length).toBe(1);
    expect(component.notifications[0].type).toBe('APROBADA');
  });

  it('CA3: al devolver una publicación pendiente con motivo pasa a BORRADOR y el anfitrión ve el motivo', () => {
    const motivo = 'Faltan fotografías nítidas de las habitaciones y reglas de convivencia.';
    component.openReturnPrompt('pending-listing-2');
    component.returnReasonInput = motivo;
    component.confirmReturn('pending-listing-2');

    const returned = component.listings.find((l) => l.id === 'pending-listing-2');
    expect(returned?.status).toBe('BORRADOR');
    expect(returned?.returnReason).toBe(motivo);
    expect(component.returnedDraftListings.some((l) => l.id === 'pending-listing-2')).toBeTrue();
    expect(component.notifications[0].type).toBe('DEVUELTA');
    expect(component.notifications[0].reason).toBe(motivo);
  });
});
