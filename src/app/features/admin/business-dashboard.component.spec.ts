import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BusinessDashboardComponent, Dashboard, fileNameFrom, toBars } from './business-dashboard.component';
import { SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';

describe('BusinessDashboardComponent · HU-056, HU-058 y HU-059', () => {
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

  describe('HU-058 · Exportar reportes a Excel', () => {
    it('CA1: descarga el reporte con los filtros elegidos y el nombre que indica el API', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(dashboard));
      await render();
      const downloadSpy = spyOn(component, 'download');
      fetchSpy.and.returnValue(
        Promise.resolve(
          new Response(new Blob(['xlsx']), {
            status: 200,
            headers: { 'Content-Disposition': 'attachment; filename="stayhub-reservas-20261028T1530.xlsx"' },
          }),
        ),
      );
      component.exportFilters = { report: 'reservas', from: '2026-10-01', to: '2026-10-31', city: ' Medellín ', status: 'CONFIRMADA' };

      await component.exportReport();

      const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
      expect(url).toBe('/api/reports/export/reservas?from=2026-10-01&to=2026-10-31&city=Medell%C3%ADn&status=CONFIRMADA');
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-admin');
      expect(downloadSpy).toHaveBeenCalledWith(jasmine.any(Blob), 'stayhub-reservas-20261028T1530.xlsx');
      expect(component.exportMessage).toContain('stayhub-reservas-20261028T1530.xlsx');
    });

    it('no envía la ciudad en el reporte de usuarios y ofrece los estados de cada reporte', () => {
      component.exportFilters = { report: 'usuarios', from: '', to: '', city: 'Bogotá', status: '' };
      expect(component.exportQuery()).toBe('');
      expect(component.statusOptions).toContain('RESTRINGIDA');
      component.exportFilters.report = 'ingresos';
      expect(component.statusOptions).toEqual([]);
    });

    it('valida las fechas y muestra el error del API', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(dashboard));
      await render();
      const calls = fetchSpy.calls.count();
      component.exportFilters = { report: 'reservas', from: '2026-10-31', to: '2026-10-01', city: '', status: '' };
      await component.exportReport();
      expect(fetchSpy.calls.count()).toBe(calls);
      expect(component.exportError).toContain('no puede ser posterior');

      fetchSpy.and.returnValue(json({ message: 'La fecha inicial debe tener el formato AAAA-MM-DD' }, 400));
      component.exportFilters = { report: 'reservas', from: '2026-10-01', to: '', city: '', status: '' };
      await component.exportReport();
      expect(component.exportError).toBe('La fecha inicial debe tener el formato AAAA-MM-DD');
    });

    it('lee el nombre del archivo de Content-Disposition', () => {
      expect(fileNameFrom('attachment; filename="a.xlsx"', 'b.xlsx')).toBe('a.xlsx');
      expect(fileNameFrom(null, 'b.xlsx')).toBe('b.xlsx');
    });
  });

  describe('HU-059 · Exportar reportes a PDF', () => {
    it('CA1, CA2: descarga el reporte en PDF usando los mismos filtros que Excel', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(dashboard));
      await render();
      const downloadSpy = spyOn(component, 'download');
      fetchSpy.and.returnValue(
        Promise.resolve(
          new Response(new Blob(['%PDF-1.3']), {
            status: 200,
            headers: { 'Content-Disposition': 'attachment; filename="stayhub-ingresos-20261028T1530.pdf"' },
          }),
        ),
      );
      component.exportFilters = { report: 'ingresos', from: '2026-10-01', to: '2026-10-31', city: 'Medellín', status: '' };

      await component.exportReportPdf();

      const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
      expect(url).toBe('/api/reports/export/ingresos/pdf?from=2026-10-01&to=2026-10-31&city=Medell%C3%ADn');
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-admin');
      expect(downloadSpy).toHaveBeenCalledWith(jasmine.any(Blob), 'stayhub-ingresos-20261028T1530.pdf');
      expect(component.exportMessage).toContain('stayhub-ingresos-20261028T1530.pdf');
    });
  });
});
