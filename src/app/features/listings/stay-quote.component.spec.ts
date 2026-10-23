import { ComponentFixture, TestBed } from '@angular/core/testing';
import { formatQuoteAmount, StayQuote, StayQuoteComponent } from './stay-quote.component';

describe('StayQuoteComponent · HU-027 Cotizar una estancia', () => {
  let fixture: ComponentFixture<StayQuoteComponent>;
  let component: StayQuoteComponent;

  const ca3: StayQuote = {
    listingId: 'apto-criterios',
    checkIn: '2027-03-01',
    checkOut: '2027-03-04',
    nights: 3,
    nightlyRate: 200000,
    baseAmount: 600000,
    discountPercentage: 0,
    discount: 0,
    cleaningFee: 50000,
    additionalServices: [{ name: 'Traslado desde el aeropuerto', cost: 80000 }],
    additionalServicesTotal: 80000,
    subtotal: 730000,
    serviceFeePercentage: 10,
    serviceFee: 73000,
    totalAmount: 803000,
    currency: 'COP',
  };

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const lines = () =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.breakdown div')).map((row) =>
      (row.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StayQuoteComponent] }).compileComponents();
    fixture = TestBed.createComponent(StayQuoteComponent);
    component = fixture.componentInstance;
    component.listingId = 'apto-criterios';
    component.maxGuests = 4;
    component.additionalServices = [
      { name: 'Traslado desde el aeropuerto', cost: 80000 },
      { name: 'Desayuno', cost: 30000 },
    ];
    fixture.detectChanges();
  });

  it('CA4: importes en COP con separador de miles y el descuento con signo menos', () => {
    expect(formatQuoteAmount(715000)).toBe('$ 715.000');
    expect(formatQuoteAmount(1441000)).toBe('$ 1.441.000');
    expect(formatQuoteAmount(140000, true)).toBe('− $ 140.000');
    expect(formatQuoteAmount(0, true)).toBe('$ 0');
  });

  it('CA3: envía los servicios adicionales elegidos y muestra cada uno como línea propia', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.returnValue(json(ca3));
    component.checkIn = '2027-03-01';
    component.checkOut = '2027-03-04';
    component.guests = 2;
    component.toggle('Traslado desde el aeropuerto');

    await component.submit();
    fixture.detectChanges();

    const [url, init] = fetchSpy.calls.mostRecent().args;
    expect(url).toBe('/api/bookings/quote');
    expect(JSON.parse(init?.body as string)).toEqual({
      listingId: 'apto-criterios',
      checkIn: '2027-03-01',
      checkOut: '2027-03-04',
      guests: 2,
      additionalServices: ['Traslado desde el aeropuerto'],
    });
    expect(lines()).toEqual([
      '$ 200.000 × 3 noches $ 600.000',
      'Descuento por estancia larga $ 0',
      'Limpieza $ 50.000',
      'Traslado desde el aeropuerto $ 80.000',
      'Tarifa de servicio (10 %) $ 73.000',
      'Total $ 803.000 COP',
    ]);
  });

  it('CA2: muestra el descuento por estancia larga con su porcentaje', async () => {
    spyOn(window, 'fetch').and.returnValue(
      json({ ...ca3, nights: 7, baseAmount: 1400000, discountPercentage: 10, discount: 140000, additionalServices: [], serviceFee: 131000, totalAmount: 1441000 }),
    );
    component.checkIn = '2027-03-01';
    component.checkOut = '2027-03-08';

    await component.submit();
    fixture.detectChanges();

    expect(lines()).toContain('Descuento por estancia larga (10 %) − $ 140.000');
    expect(lines()).toContain('Total $ 1.441.000 COP');
  });

  it('valida las fechas antes de cotizar', async () => {
    const fetchSpy = spyOn(window, 'fetch');
    await component.submit();
    expect(component.errorMessage).toContain('Elige la fecha de llegada');

    component.checkIn = '2027-03-04';
    component.checkOut = '2027-03-01';
    await component.submit();
    expect(component.errorMessage).toBe('La fecha de salida debe ser posterior a la fecha de llegada.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('muestra el mensaje del API si rechaza la cotización', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ message: 'El servicio adicional «Spa» no está disponible en esta publicación' }, 400));
    component.checkIn = '2027-03-01';
    component.checkOut = '2027-03-04';

    await component.submit();

    expect(component.errorMessage).toContain('«Spa»');
    expect(component.quote).toBeNull();
  });

  it('cambiar un dato borra la cotización anterior', async () => {
    spyOn(window, 'fetch').and.returnValue(json(ca3));
    component.checkIn = '2027-03-01';
    component.checkOut = '2027-03-04';
    await component.submit();
    expect(component.quote).not.toBeNull();

    component.toggle('Desayuno');
    expect(component.quote).toBeNull();
  });
});
