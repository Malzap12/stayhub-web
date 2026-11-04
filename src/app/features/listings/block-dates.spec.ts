import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { blockErrorMessage, HostAvailabilityComponent, shortDate } from './host-availability.component';
import { BlockedPeriod } from '../../shared/models/listing.model';
import { clearActiveSession, saveActiveSession } from '../../core/guards/auth.guard';

describe('HU-021 · Bloquear fechas manualmente', () => {
  let fixture: ComponentFixture<HostAvailabilityComponent>;
  let component: HostAvailabilityComponent;

  const year = new Date().getFullYear() + 1;
  const day = (date: number) => `${year}-03-${String(date).padStart(2, '0')}`;
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const block = (overrides: Partial<BlockedPeriod> = {}): BlockedPeriod => ({
    id: 'block-1',
    listingId: 'listing-1',
    type: 'BLOQUEO',
    checkIn: day(10),
    checkOut: day(13),
    blockedNights: [day(10), day(11), day(12)],
    note: 'Mantenimiento',
    ...overrides,
  });
  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => (element().textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    saveActiveSession({ token: 'jwt-host', email: 'host@stayhub.com', name: 'Ana', role: 'ANFITRION', expiresAt: Date.now() + 60_000 } as never);
    await TestBed.configureTestingModule({ imports: [HostAvailabilityComponent], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(HostAvailabilityComponent);
    component = fixture.componentInstance;
    component.hostListings = [{ id: 'listing-1', title: 'Casa de campo', status: 'ACTIVA', statusLabel: 'Activa', isComplete: true, missingFields: [], createdAt: '' }];
    component.selectedListingId = 'listing-1';
  });

  afterEach(() => clearActiveSession());

  it('CA1: bloquea de «Desde» a «Hasta» con la nota y lo muestra en la lista', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(block(), 201));
    component.blockStartInput = day(10);
    component.blockEndInput = day(12);
    component.blockNoteInput = ' Mantenimiento ';

    await component.blockDates();
    fixture.detectChanges();

    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toBe('/api/listings/listing-1/blocked-dates');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-host');
    expect(JSON.parse(String(init.body))).toEqual({ startDate: day(10), endDate: day(12), note: 'Mantenimiento' });
    expect(component.blockedDates).toEqual([block()]);
    expect(component.successMessage).toBe(`Bloqueaste del ${shortDate(day(10))} al ${shortDate(day(12))}. Esas noches ya no se pueden reservar.`);
    expect(text()).toContain('3 noches bloqueadas · Mantenimiento');
    expect(element().querySelector('.blocked-item button')?.textContent?.trim()).toBe('Desbloquear');
  });

  it('CA1: un solo día se bloquea dejando «Hasta» vacío', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(block({ checkOut: day(11), blockedNights: [day(10)], note: undefined }), 201));
    component.blockStartInput = day(10);

    await component.blockDates();

    expect(JSON.parse(String((fetchSpy.calls.mostRecent().args[1] as RequestInit).body))).toEqual({ startDate: day(10), endDate: day(10) });
    expect(component.successMessage).toContain(`Bloqueaste el ${shortDate(day(10))}`);
  });

  it('valida las fechas sin llamar al servidor', async () => {
    const fetchSpy = spyOn(window, 'fetch');
    component.blockStartInput = day(12);
    component.blockEndInput = day(10);

    await component.blockDates();

    expect(component.errorMessage).toBe('La fecha «Hasta» no puede ser anterior a «Desde».');
    component.blockStartInput = '2020-01-01';
    component.blockEndInput = '2020-01-02';
    await component.blockDates();
    expect(component.errorMessage).toBe('No se pueden bloquear fechas que ya pasaron.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('explica cuando las fechas ya tienen reservas', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ reason: 'FECHAS_OCUPADAS', reservedDates: [day(11)], blockedDates: [] }, 400));
    component.blockStartInput = day(10);
    component.blockEndInput = day(12);

    await component.blockDates();

    expect(component.errorMessage).toBe(`No se pueden bloquear: ya hay reservas el ${shortDate(day(11))}.`);
    expect(component.blockedDates).toEqual([]);
  });

  it('CA2: al desbloquear quita el bloqueo y avisa que vuelven a estar disponibles', async () => {
    component.blockedDates = [block()];
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json({ listingId: 'listing-1', blockId: 'block-1', releasedNights: block().blockedNights }));

    await component.unblockDates(block());

    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toBe('/api/listings/listing-1/blocked-dates/block-1');
    expect(init.method).toBe('DELETE');
    expect(component.blockedDates).toEqual([]);
    expect(component.successMessage).toContain('Esas noches vuelven a estar disponibles.');
  });

  it('carga los bloqueos del alojamiento seleccionado', async () => {
    spyOn(window, 'fetch').and.returnValue(json([block()]));

    await component.loadBlockedDates();

    expect(component.blockedDates).toEqual([block()]);
  });

  it('mensajes de error sin códigos internos', () => {
    expect(blockErrorMessage(400, { reason: 'FUERA_DE_DISPONIBILIDAD', outsideDates: [day(31)] })).toBe(
      `Solo puedes bloquear fechas dentro de tus periodos disponibles. Fuera de ellos: ${shortDate(day(31))}.`,
    );
    expect(blockErrorMessage(400, { reason: 'FECHAS_OCUPADAS', reservedDates: [], blockedDates: [day(10)] })).toBe(
      `Algunas de esas fechas ya están bloqueadas (${shortDate(day(10))}).`,
    );
    expect(blockErrorMessage(404, {})).toBe('El alojamiento no existe o no te pertenece.');
  });
});
