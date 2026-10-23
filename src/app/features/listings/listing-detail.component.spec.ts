import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { amenityLabel, formatCop, ListingDetail, ListingDetailComponent } from './listing-detail.component';
import { clearActiveSession, saveActiveSession } from '../../core/guards/auth.guard';

describe('ListingDetailComponent · HU-026 Consultar el detalle de una publicación', () => {
  let fixture: ComponentFixture<ListingDetailComponent>;
  let element: HTMLElement;

  const detail: ListingDetail = {
    id: 'demo-bogota-chapinero',
    title: 'Apartamento en Chapinero Alto',
    description: 'Apartamento luminoso con balcón.',
    location: { address: 'Carrera 4 # 57-20', city: 'Bogotá', department: 'Cundinamarca', country: 'Colombia', text: 'Carrera 4 # 57-20, Bogotá, Cundinamarca, Colombia' },
    propertyType: 'APARTAMENTO',
    propertyTypeLabel: 'Apartamento',
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    pricePerNight: 280000,
    amenities: ['WIFI', 'KITCHEN'],
    rules: ['No fumar'],
    images: ['https://img/1.jpg', 'https://img/2.jpg'],
    cancellationPolicy: {
      code: 'FLEXIBLE',
      name: 'Flexible',
      description: 'Reembolso del 100 % si cancelas hasta 48 horas antes de la llegada; después, del 50 %.',
      rules: [],
    },
    additionalServices: [{ name: 'Traslado desde el aeropuerto', cost: 80000 }],
    averageRating: 4.9,
    reviewCount: 18,
    hostName: 'Valentina Rojas',
    status: 'ACTIVA',
  };

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

  const render = async () => {
    fixture = TestBed.createComponent(ListingDetailComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  };

  const text = () => (element.textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'demo-bogota-chapinero' }) } } },
      ],
    }).compileComponents();
  });

  afterEach(() => clearActiveSession());

  it('CA1: muestra título, descripción, ubicación, tipo, capacidad, precio, servicios, reglas, imágenes, política, adicionales y calificación', async () => {
    spyOn(window, 'fetch').and.returnValues(json(detail), json({ reviews: [] }));
    await render();

    const page = text();
    for (const expected of [
      'Apartamento en Chapinero Alto',
      'Apartamento luminoso con balcón.',
      'Carrera 4 # 57-20, Bogotá, Cundinamarca, Colombia',
      'Apartamento',
      '2 huéspedes',
      '$ 280.000',
      'Wi-Fi',
      'Cocina',
      'No fumar',
      'Política de cancelación · Flexible',
      '48 horas',
      'Traslado desde el aeropuerto',
      '$ 80.000',
      '★ 4.90 · 18 reseñas',
    ]) {
      expect(page).toContain(expected);
    }
    expect(element.querySelectorAll('.thumbs button').length).toBe(2);
    expect(element.querySelector('.main-image')?.getAttribute('src')).toBe('https://img/1.jpg');
  });

  it('CA1: indica cuando no hay calificaciones ni servicios adicionales', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ ...detail, reviewCount: 0, averageRating: 0, additionalServices: [] }));
    await render();

    expect(text()).toContain('Sin calificaciones todavía');
    expect(text()).toContain('Este alojamiento no ofrece servicios adicionales.');
  });

  it('CA2: si el API responde 404 indica que la publicación no está disponible', async () => {
    spyOn(window, 'fetch').and.returnValue(json({ message: 'Esta publicación no está disponible' }, 404));
    await render();

    expect(element.querySelector('.unavailable h1')?.textContent).toContain('Esta publicación no está disponible');
    expect(element.querySelector('article')).toBeNull();
  });

  it('CA2: envía la sesión para que quien tiene reservas pueda ver una publicación no activa', async () => {
    saveActiveSession({ token: 'jwt-huesped', email: 'h@stayhub.com', name: 'H', role: 'HUESPED', expiresAt: Date.now() + 60_000 });
    const fetchSpy = spyOn(window, 'fetch').and.returnValues(json(detail), json({ reviews: [] }));
    await render();

    const [url, init] = fetchSpy.calls.first().args;
    expect(url).toBe('/api/listings/demo-bogota-chapinero');
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-huesped');
  });

  it('nombra los servicios en español y formatea pesos', () => {
    expect(amenityLabel('AIRE_ACONDICIONADO')).toBe('Aire acondicionado');
    expect(amenityLabel('POOL')).toBe('Piscina');
    expect(amenityLabel('BALCON_PRIVADO')).toBe('Balcon privado');
    expect(formatCop(1250000)).toBe('$ 1.250.000');
    expect(formatCop(undefined)).toBe('Por definir');
  });
});
