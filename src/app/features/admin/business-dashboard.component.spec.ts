import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusinessDashboardComponent, Dashboard, toBars } from './business-dashboard.component';
import { SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';

describe('BusinessDashboardComponent · HU-056', () => {
  let fixture: ComponentFixture<BusinessDashboardComponent>;
  let component: BusinessDashboardComponent;

  const dashboard: Dashboard = {
    generatedAt: '2026-10-28T15:00:00.000Z',
    usersByRole: { HUESPED: 31, ANFITRION: 22, ADMINISTRADOR: 1, total: 54 },
    activeListings: 29,
    bookingsByStatus: { PENDIENTE: 5, CONFIRMADA: 13, CANCELADA: 7, COMPLETADA: 3, EN_REVISION: 1, total: 29 },
    estimatedRevenue: { currency: 'COP', grossBookingValue: 13_552_000, platformFees: 1_452_000, bookings: 16 },
    topCities: [
      { city: 'Medellín', bookings: 6, grossBookingValue: 5_040_000 },
      { city: 'Guatapé', bookings: 4, grossBookingValue: 3_600_000 },
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

  it('CA1: carga los indicadores con el token del administrador y los muestra', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(dashboard));
    const element = await render();

    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toBe('/api/reports/dashboard');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-admin');

    const kpi = (name: string) => element.querySelector(`[data-kpi="${name}"] .kpi-value`)?.textContent?.trim();
    expect(kpi('users')).toBe('54');
    expect(kpi('listings')).toBe('29');
    expect(kpi('bookings')).toBe('29');
    expect(kpi('revenue')).toContain('13.552.000');
    expect(element.querySelectorAll('.cities li').length).toBe(2);
    expect(element.querySelector('.cities li')?.textContent).toContain('Medellín');
  });

  it('CA1: muestra las reservas de cada estado y los usuarios de cada rol', async () => {
    spyOn(window, 'fetch').and.returnValue(json(dashboard));
    await render();

    expect(component.statusBars.map((bar) => [bar.label, bar.value])).toEqual([
      ['Confirmadas', 13],
      ['Completadas', 3],
      ['Pendientes de pago', 5],
      ['En revisión', 1],
      ['Canceladas', 7],
    ]);
    expect(component.roleBars.map((bar) => bar.value)).toEqual([31, 22, 1]);
  });

  it('las barras son proporcionales al mayor valor', () => {
    expect(toBars([['a', 10], ['b', 5], ['c', 0]]).map((bar) => bar.width)).toEqual([100, 50, 0]);
    expect(toBars([['a', 0]])[0].width).toBe(0);
  });

  it('sin reservas confirmadas indica que no hay ciudades', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ ...dashboard, topCities: [] }));
    const element = await render();
    expect(element.textContent).toContain('Todavía no hay reservas confirmadas ni completadas');
  });

  it('CA3: si el API responde 403 informa que solo el administrador puede verlo', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ message: 'Acceso denegado' }, 403));
    await render();

    expect(component.dashboard).toBeNull();
    expect(component.errorMessage).toBe('Solo el administrador puede ver los indicadores del negocio.');
  });
});
