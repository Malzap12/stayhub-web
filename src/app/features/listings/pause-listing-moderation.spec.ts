import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminModerationComponent } from './admin-moderation.component';
import { SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';

describe('HU-055 · Pausar una publicación por moderación (CA1 · RF-073, RN-031)', () => {
  let fixture: ComponentFixture<AdminModerationComponent>;
  let component: AdminModerationComponent;

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  beforeEach(async () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token: 'jwt-admin',
        email: 'admin@stayhub.com',
        name: 'Administrador',
        role: 'ADMINISTRADOR',
        expiresAt: Date.now() + 60_000,
      }),
    );

    await TestBed.configureTestingModule({
      imports: [AdminModerationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminModerationComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  it('CA1 · Abre el modal de pausa para una publicación ACTIVA y valida el motivo mínimo', async () => {
    component.allListings = [
      {
        id: 'list-1',
        title: 'Cabaña Campestre',
        status: 'ACTIVA',
        hostName: 'Carlos Anfitrión',
      },
    ];

    component.openPausePrompt('list-1');
    expect(component.pausingListingId).toBe('list-1');
    expect(component.dialog?.kind).toBe('pause');
    expect(component.dialog?.title).toBe('Pausar publicación');

    // Validación de motivo < 5 caracteres
    component.pauseReasonInput = 'Abc';
    await component.confirmPause('list-1');
    expect(component.pauseError).toBe('Indica el motivo de la pausa (al menos 5 caracteres).');
  });

  it('CA1 · Al confirmar la pausa con motivo válido, envía PATCH /pause-moderation y actualiza el estado a PAUSADA', async () => {
    component.allListings = [
      {
        id: 'list-1',
        title: 'Cabaña Campestre',
        status: 'ACTIVA',
        hostName: 'Carlos Anfitrión',
      },
    ];

    const fetchSpy = spyOn(window, 'fetch').and.callFake(() =>
      json({
        listingId: 'list-1',
        status: 'PAUSADA',
        previousStatus: 'ACTIVA',
        pauseReason: 'Revisión preventiva de servicios',
        notification: {
          id: 'notif-1',
          type: 'PAUSADA',
          message: 'Tu publicación "Cabaña Campestre" fue pausada por moderación. Motivo: Revisión preventiva de servicios',
          reason: 'Revisión preventiva de servicios',
          createdAt: new Date().toISOString(),
        },
      }),
    );

    component.openPausePrompt('list-1');
    component.pauseReasonInput = 'Revisión preventiva de servicios';
    await component.confirmPause('list-1');

    expect(fetchSpy).toHaveBeenCalled();
    const [url, opts] = fetchSpy.calls.mostRecent().args;
    expect(url).toBe('/api/listings/list-1/pause-moderation');
    expect(opts?.method).toBe('PATCH');
    expect(opts?.body).toBe(JSON.stringify({ reason: 'Revisión preventiva de servicios' }));

    const item = component.allListings.find((l) => l.id === 'list-1');
    expect(item?.status).toBe('PAUSADA');
    expect(item?.pauseReason).toBe('Revisión preventiva de servicios');
    expect(component.feedbackMessage).toContain('quedó pausada por moderación');
    expect(component.pausingListingId).toBeNull();
  });
});
