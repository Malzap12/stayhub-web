import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvailabilityCalendarComponent, ListingCalendar, monthGrid, monthLabel } from './availability-calendar.component';
import { clearActiveSession, saveActiveSession } from '../../core/guards/auth.guard';

describe('AvailabilityCalendarComponent · HU-022 Consultar el calendario de disponibilidad', () => {
  let fixture: ComponentFixture<AvailabilityCalendarComponent>;
  let component: AvailabilityCalendarComponent;

  const calendar = (view: ListingCalendar['view'], statuses: string[]): ListingCalendar => ({
    listingId: 'demo-bogota-chapinero',
    view,
    today: '2026-11-02',
    from: '2026-11-01',
    to: '2027-10-31',
    months: [
      {
        month: '2026-11',
        days: statuses.map((status, i) => ({ date: `2026-11-0${i + 1}`, status: status as never })),
      },
    ],
  });

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  const render = async () => {
    component.ngOnChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AvailabilityCalendarComponent] }).compileComponents();
    fixture = TestBed.createComponent(AvailabilityCalendarComponent);
    component = fixture.componentInstance;
    component.listingId = 'demo-bogota-chapinero';
  });

  afterEach(() => clearActiveSession());

  it('ubica cada mes empezando en lunes y nombra los meses en español', () => {
    // El 1 de noviembre de 2026 es domingo: 6 huecos antes.
    const grid = monthGrid([{ date: '2026-11-01', status: 'DISPONIBLE' }]);
    expect(grid.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(grid[6]?.day).toBe(1);
    expect(monthLabel('2026-11')).toBe('noviembre de 2026');
  });

  it('CA1: la vista pública muestra disponibles y no disponibles con su leyenda', async () => {
    spyOn(window, 'fetch').and.returnValue(json(calendar('PUBLICA', ['PASADA', 'DISPONIBLE', 'NO_DISPONIBLE'])));
    const element = await render();

    expect(component.legend).toEqual(['DISPONIBLE', 'NO_DISPONIBLE']);
    expect(element.querySelector('[data-date="2026-11-02"]')?.getAttribute('data-status')).toBe('DISPONIBLE');
    expect(element.querySelector('[data-date="2026-11-03"]')?.getAttribute('aria-label')).toBe('2026-11-03: No disponible');
    expect(element.textContent).toContain('1 noches disponibles');
  });

  it('CA2: la vista del anfitrión distingue reservadas y bloqueadas', async () => {
    saveActiveSession({ token: 'jwt-host', email: 'a@stayhub.com', name: 'A', role: 'ANFITRION', expiresAt: Date.now() + 60_000 });
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(
      json(calendar('ANFITRION', ['DISPONIBLE', 'RESERVADA', 'BLOQUEADA', 'SIN_PERIODO'])),
    );
    const element = await render();

    const [url, init] = fetchSpy.calls.mostRecent().args;
    expect(url).toBe('/api/listings/demo-bogota-chapinero/calendar');
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-host');
    expect(component.legend).toEqual(['DISPONIBLE', 'RESERVADA', 'BLOQUEADA', 'SIN_PERIODO']);
    expect(component.count('RESERVADA')).toBe(1);
    expect(component.count('BLOQUEADA')).toBe(1);
    expect(element.textContent).toContain('1 reservadas · 1 bloqueadas');
  });

  it('si la publicación no está disponible lo indica sin mostrar meses', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ message: 'Esta publicación no está disponible' }, 404));
    const element = await render();

    expect(component.unavailable).toBeTrue();
    expect(element.querySelector('.month')).toBeNull();
  });
});
