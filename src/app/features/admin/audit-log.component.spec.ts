import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuditLogComponent } from './audit-log.component';
import { SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';
import { AuditEventsPage, auditDetailText, auditQuery, EMPTY_AUDIT_FILTERS } from '../../shared/models/audit.model';

describe('AuditLogComponent · HU-054', () => {
  let fixture: ComponentFixture<AuditLogComponent>;
  let component: AuditLogComponent;

  const page = (overrides: Partial<AuditEventsPage> = {}): AuditEventsPage => ({
    data: [
      {
        id: 'e2',
        actor: 'admin@inversioneslr.com',
        action: 'LISTING_STATUS_CHANGE',
        entity: 'Listing',
        entityId: 'l1',
        occurredAt: '2026-10-28T15:30:00.000Z',
        result: 'EXITOSO',
        detail: 'PENDIENTE_REVISION -> ACTIVA',
      },
      {
        id: 'e1',
        actor: 'anonimo',
        action: 'LOGIN',
        entity: 'AuthSession',
        occurredAt: '2026-10-28T15:00:00.000Z',
        result: 'FALLIDO',
      },
    ],
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
    ...overrides,
  });
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const lastUrl = (spy: jasmine.Spy) => spy.calls.mostRecent().args[0] as string;

  beforeEach(async () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ token: 'jwt-admin', email: 'admin@inversioneslr.com', name: 'Admin', role: 'ADMINISTRADOR', expiresAt: Date.now() + 60_000 }),
    );
    await TestBed.configureTestingModule({ imports: [AuditLogComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(AuditLogComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  it('CA1: muestra actor, acción, entidad, fecha y resultado con nombres legibles', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(page()));
    const element = await render();

    expect(lastUrl(fetchSpy)).toBe('/api/audit/events?page=1&limit=20');
    const [init] = fetchSpy.calls.mostRecent().args.slice(1) as [RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-admin');

    const rows = element.querySelectorAll('.audit-row');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Cambio de estado de una publicación');
    expect(rows[0].textContent).toContain('En revisión → Activa');
    expect(rows[0].textContent).toContain('Publicación');
    expect(rows[0].textContent).toContain('Exitoso');
    expect(rows[1].textContent).toContain('Sin sesión');
    expect(rows[1].querySelector('.badge.failed')?.textContent?.trim()).toBe('Fallido');
    expect(element.textContent).not.toMatch(/LISTING_STATUS_CHANGE|PENDIENTE_REVISION|AuthSession/);
  });

  it('CA1: pasa de página conservando los filtros aplicados', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(page({ total: 45, totalPages: 3 })));
    const element = await render();
    expect(element.querySelector('.pager')?.textContent).toContain('Página 1 de 3');

    component.filters.actor = 'huesped';
    component.applyFilters();
    await fixture.whenStable();
    component.filters.actor = 'otro, sin aplicar';
    await component.load(2);

    expect(lastUrl(fetchSpy)).toBe('/api/audit/events?actor=huesped&page=2&limit=20');
  });

  it('CA2: envía todos los filtros elegidos y vuelve a la primera página', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(page()));
    await render();

    component.filters = { from: '2026-10-01', to: '2026-10-31', actor: ' huesped ', action: 'LOGIN', entity: 'AuthSession', result: 'FALLIDO' };
    component.applyFilters();
    await fixture.whenStable();

    expect(lastUrl(fetchSpy)).toBe(
      '/api/audit/events?from=2026-10-01&to=2026-10-31&actor=huesped&action=LOGIN&entity=AuthSession&result=FALLIDO&page=1&limit=20',
    );
  });

  it('CA2: no consulta si «Desde» es posterior a «Hasta»', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(page()));
    await render();
    fetchSpy.calls.reset();

    component.filters.from = '2026-10-20';
    component.filters.to = '2026-10-01';
    component.applyFilters();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('posterior');
  });

  it('CA2: avisa cuando ningún evento cumple los filtros', async () => {
    spyOn(window, 'fetch').and.returnValue(json(page({ data: [], total: 0 })));
    const element = await render();

    expect(element.textContent).toContain('No hay eventos que cumplan todos los filtros.');
  });

  it('Limpiar quita los filtros y vuelve a consultar todo', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(page()));
    await render();
    component.filters.entity = 'Booking';
    component.applyFilters();
    component.clearFilters();
    await fixture.whenStable();

    expect(component.filters).toEqual(EMPTY_AUDIT_FILTERS);
    expect(lastUrl(fetchSpy)).toBe('/api/audit/events?page=1&limit=20');
  });

  it('informa cuando la cuenta no es de administrador', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ message: 'Forbidden' }, 403));
    await render();

    expect(component.errorMessage).toBe('Solo el administrador puede consultar la auditoría.');
  });

  it('el detalle no muestra referencias internas', () => {
    expect(auditDetailText('Tarifa de servicio actualizada: valor anterior 12 %, valor nuevo 15 % (RN-014)')).toBe(
      'Tarifa de servicio actualizada: valor anterior 12 %, valor nuevo 15 %',
    );
    expect(auditDetailText('Reserva LR-1 pasó de CONFIRMADA a EN_REVISION: HU-051')).toBe('Reserva LR-1 pasó de Confirmada a En revisión:');
    expect(auditDetailText('Exportó reservas a PDF')).toBe('Exportó reservas a PDF');
  });

  it('arma la consulta solo con los filtros llenos', () => {
    expect(auditQuery({ ...EMPTY_AUDIT_FILTERS, entity: 'Booking' }, 3, 50)).toBe('entity=Booking&page=3&limit=50');
  });
});
