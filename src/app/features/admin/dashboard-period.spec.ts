import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusinessDashboardComponent, Dashboard } from './business-dashboard.component';
import { SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';

describe('HU-057 · Filtrar el dashboard por periodo (CA1 · RF-075)', () => {
  let fixture: ComponentFixture<BusinessDashboardComponent>;
  let component: BusinessDashboardComponent;

  const mockDashboard: Dashboard = {
    generatedAt: '2026-10-28T15:00:00.000Z',
    period: { from: '2026-10-01', to: '2026-10-31' },
    usersByRole: { HUESPED: 31, ANFITRION: 22, ADMINISTRADOR: 1, total: 54 },
    activeListings: 29,
    bookingsByStatus: { PENDIENTE: 1, CONFIRMADA: 5, CANCELADA: 2, COMPLETADA: 3, EN_REVISION: 0, total: 11 },
    estimatedRevenue: { currency: 'COP', grossBookingValue: 4_500_000, platformFees: 450_000, bookings: 8 },
    topCities: [
      { city: 'Medellín', bookings: 5, grossBookingValue: 3_000_000 },
      { city: 'Bogotá', bookings: 3, grossBookingValue: 1_500_000 },
    ],
  };

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ token: 'jwt-admin', email: 'admin@inversioneslr.com', name: 'Admin', role: 'ADMINISTRADOR', expiresAt: Date.now() + 60_000 }),
    );
    await TestBed.configureTestingModule({ imports: [BusinessDashboardComponent] }).compileComponents();
    fixture = TestBed.createComponent(BusinessDashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  it('CA1 · Envía los parámetros from y to al API al filtrar por periodo', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(() => json(mockDashboard));
    component.periodFilter.from = '2026-10-01';
    component.periodFilter.to = '2026-10-31';

    await component.load();

    expect(fetchSpy).toHaveBeenCalled();
    const [url] = fetchSpy.calls.mostRecent().args;
    expect(url).toContain('/api/reports/dashboard?from=2026-10-01&to=2026-10-31');
    expect(component.dashboard?.period?.from).toBe('2026-10-01');
    expect(component.dashboard?.bookingsByStatus.total).toBe(11);
  });

  it('CA1 · Muestra error y no realiza la petición si la fecha inicial es posterior a la final', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(() => json(mockDashboard));
    component.periodFilter.from = '2026-11-15';
    component.periodFilter.to = '2026-11-01';

    await component.load();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('La fecha inicial no puede ser posterior a la fecha final.');
  });

  it('CA1 · Permite restablecer el filtro de periodo y vuelve a cargar los datos totales', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(() => json({ ...mockDashboard, period: undefined }));
    component.periodFilter.from = '2026-10-01';
    component.periodFilter.to = '2026-10-31';

    component.clearPeriodFilter();

    expect(component.periodFilter.from).toBe('');
    expect(component.periodFilter.to).toBe('');
    expect(fetchSpy).toHaveBeenCalled();
    const [url] = fetchSpy.calls.mostRecent().args;
    expect(url).toBe('/api/reports/dashboard');
  });

  it('Muestra en el DOM el badge del periodo aplicado', async () => {
    spyOn(window, 'fetch').and.callFake(() => json(mockDashboard));
    const el = await render();

    const badge = el.querySelector('.period-badge');
    expect(badge?.textContent).toContain('Periodo aplicado: 2026-10-01 — 2026-10-31');
  });
});
