import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiListing, ListingListComponent } from './listing-list.component';

describe('ListingListComponent · HU-024 Buscar por ciudad, fechas y huéspedes', () => {
  let fixture: ComponentFixture<ListingListComponent>;
  let component: ListingListComponent;
  let element: HTMLElement;

  const chapinero: ApiListing = {
    id: 'demo-bogota-chapinero',
    title: 'Apartamento en Chapinero Alto',
    description: 'Apartamento luminoso con balcón.',
    city: 'Bogotá',
    propertyType: 'APARTAMENTO',
    pricePerNight: 280000,
    maxGuests: 2,
    bedrooms: 1,
    images: ['https://images.unsplash.com/foto.jpg'],
    rating: 4.9,
    hostName: 'Valentina Rojas',
  };

  const searchResponse = (data: ApiListing[], status = 200) =>
    new Response(JSON.stringify(status === 200 ? { data, total: data.length, page: 1, totalPages: 1 } : data), { status });

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  };

  const requestedQuery = (spy: jasmine.Spy) =>
    new URLSearchParams((spy.calls.mostRecent().args[0] as string).split('?')[1]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListingListComponent);
    component = fixture.componentInstance;
  });

  it('CA4: al abrir busca sin fechas y muestra las publicaciones del API', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(searchResponse([chapinero]));
    await render();

    const query = requestedQuery(fetchSpy);
    expect(query.has('checkIn')).toBeFalse();
    expect(query.has('checkOut')).toBeFalse();
    expect(element.querySelectorAll('.listing-card').length).toBe(1);
    expect(element.querySelector('.listing-card h2')?.textContent).toContain('Apartamento en Chapinero Alto');
  });

  it('CA1: envía ciudad, fechas y huéspedes al API', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(searchResponse([chapinero]));
    await render();

    component.form = { city: ' Bogotá ', checkIn: '2026-11-10', checkOut: '2026-11-13', guests: 2 };
    await component.search();

    const query = requestedQuery(fetchSpy);
    expect(query.get('city')).toBe('Bogotá');
    expect(query.get('checkIn')).toBe('2026-11-10');
    expect(query.get('checkOut')).toBe('2026-11-13');
    expect(query.get('guests')).toBe('2');
    expect(component.resultsSummary).toBe('1 alojamiento en Bogotá del 2026-11-10 al 2026-11-13 para 2 huéspedes');
  });

  it('CA1: muestra capacidad, tipo y precio en pesos de cada resultado', () => {
    const item = component.toItem(chapinero);

    expect(item.guests).toBe(2);
    expect(item.category).toBe('Apartamento');
    expect(item.priceCop).toContain('280.000');
  });

  it('CA3: si la salida no es posterior a la llegada muestra el error y no busca', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(searchResponse([]));
    await render();
    fetchSpy.calls.reset();

    component.form = { city: 'Bogotá', checkIn: '2026-11-13', checkOut: '2026-11-10', guests: 2 };
    await component.search();
    fixture.detectChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(element.querySelector('.form-error')?.textContent).toContain(
      'La fecha de salida debe ser posterior a la fecha de llegada',
    );

    component.form = { city: 'Bogotá', checkIn: '2026-11-10', checkOut: '2026-11-10', guests: 2 };
    await component.search();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('CA3: exige ambas fechas y al menos un huésped', () => {
    component.form = { city: 'Bogotá', checkIn: '2026-11-10', checkOut: '', guests: 2 };
    expect(component.datesError).toContain('Indica la fecha de llegada y la de salida');

    component.form = { city: 'Bogotá', checkIn: '', checkOut: '', guests: 0 };
    expect(component.datesError).toBe('');
    expect(component.guestsError).toContain('al menos 1');
  });

  it('muestra un mensaje cuando no hay resultados', async () => {
    spyOn(window, 'fetch').and.resolveTo(searchResponse([]));
    await render();

    expect(element.querySelector('.empty-state')?.textContent).toContain('No encontramos alojamientos');
  });

  it('muestra el mensaje del API si rechaza la búsqueda', async () => {
    spyOn(window, 'fetch').and.resolveTo(
      searchResponse({ message: 'La fecha de salida debe ser posterior a la fecha de llegada' } as never, 400),
    );
    await render();

    expect(element.querySelector('.alert-error')?.textContent).toContain('La fecha de salida debe ser posterior');
  });

  describe('HU-025 · Filtrar por tipo, precio y servicios', () => {
    it('CA1: envía el tipo y el rango de precio al API', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.resolveTo(searchResponse([chapinero]));
      await render();

      component.filters = { propertyType: 'APARTAMENTO', minPrice: 150000, maxPrice: 300000, amenities: [] };
      await component.search();

      const query = requestedQuery(fetchSpy);
      expect(query.get('propertyType')).toBe('APARTAMENTO');
      expect(query.get('minPrice')).toBe('150000');
      expect(query.get('maxPrice')).toBe('300000');
      expect(query.has('amenities')).toBeFalse();
    });

    it('CA2: al marcar Wi-Fi y Parqueadero busca de nuevo pidiendo ambos servicios', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.resolveTo(searchResponse([{ ...chapinero, amenities: ['WIFI', 'PARKING', 'WIFI'] }]));
      await render();

      component.toggleAmenity('WIFI');
      component.toggleAmenity('PARQUEADERO');
      await fixture.whenStable();
      fixture.detectChanges();

      expect(requestedQuery(fetchSpy).get('amenities')).toBe('WIFI,PARQUEADERO');
      expect(component.activeFilterCount).toBe(2);
      // Los códigos equivalentes se muestran con el mismo nombre y sin repetir.
      expect(component.listings[0].amenities).toEqual(['Wi-Fi', 'Parqueadero']);
      expect(element.querySelectorAll('.amenity-chip.selected').length).toBe(2);

      component.toggleAmenity('WIFI');
      expect(component.filters.amenities).toEqual(['PARQUEADERO']);
    });

    it('no busca si el precio mínimo es mayor que el máximo', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.resolveTo(searchResponse([chapinero]));
      await render();
      const calls = fetchSpy.calls.count();

      component.filters = { propertyType: '', minPrice: 300000, maxPrice: 150000, amenities: [] };
      await component.search();

      expect(fetchSpy.calls.count()).toBe(calls);
      expect(component.formError).toBe('El precio mínimo no puede ser mayor que el precio máximo.');
    });

    it('CA3: si ningún resultado cumple los filtros muestra «Sin resultados» y permite limpiarlos', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.resolveTo(searchResponse([]));
      await render();
      component.filters = { propertyType: 'FINCA', minPrice: 900000, maxPrice: null, amenities: ['PISCINA'] };
      await component.search();
      fixture.detectChanges();

      const empty = element.querySelector('.empty-state') as HTMLElement;
      expect(empty.textContent).toContain('Sin resultados');
      const clear = empty.querySelector('button') as HTMLButtonElement;
      expect(clear.textContent).toContain('Limpiar filtros');

      fetchSpy.and.resolveTo(searchResponse([chapinero]));
      clear.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.hasActiveFilters).toBeFalse();
      const query = requestedQuery(fetchSpy);
      expect(['propertyType', 'minPrice', 'maxPrice', 'amenities'].some((key) => query.has(key))).toBeFalse();
      expect(element.querySelectorAll('.listing-card').length).toBe(1);
    });

    it('sin filtros activos conserva el mensaje de la búsqueda por ciudad y fechas', async () => {
      spyOn(window, 'fetch').and.resolveTo(searchResponse([]));
      await render();
      expect(element.querySelector('.empty-state')?.textContent).toContain('No encontramos alojamientos');
      expect(element.querySelector('.clear-filters')).toBeNull();
    });
  });
});
