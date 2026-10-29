import { CANCELLATION_POLICIES_CATALOG, formatCop, ListingDraftFormComponent, MAX_IMAGE_BYTES, parseCop } from './listing-draft-form.component';
import { clearActiveSession, SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';

describe('ListingDraftFormComponent (HU-010 · Crear publicación y HU-039 · Política Flexible)', () => {
  let component: ListingDraftFormComponent;
  let fetchSpy: jasmine.Spy;

  const jsonResponse = (body: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

  beforeEach(() => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token: 'jwt-host',
        email: 'anfitriona@stayhub.com',
        name: 'Anfitriona',
        role: 'ANFITRION',
        expiresAt: Date.now() + 60_000,
      }),
    );
    component = new ListingDraftFormComponent();
    fetchSpy = spyOn(window, 'fetch');
  });

  afterEach(() => clearActiveSession());

  it('CA1: envía toda la información básica con la sesión del anfitrión', async () => {
    fetchSpy.and.returnValue(
      jsonResponse(
        { id: 'listing-1', title: 'Cabaña del Bosque', status: 'BORRADOR', isComplete: true, missingFields: [], createdAt: '' },
        201,
      ),
    );
    component.form = {
      title: ' Cabaña del Bosque ',
      description: 'Cabaña con chimenea',
      city: 'Guatapé',
      department: 'Antioquia',
      address: 'Vereda El Roble',
      propertyType: 'CABANA',
      maxGuests: 4,
      pricePerNight: 320000,
      amenities: ['WIFI'],
      rulesText: 'No fumar\n\nNo fiestas',
      imagesText: 'https://img/1.jpg',
    };

    await component.save();

    const [url, init] = fetchSpy.calls.mostRecent().args;
    expect(url).toBe('/api/listings');
    expect(init.headers.Authorization).toBe('Bearer jwt-host');
    expect(JSON.parse(init.body)).toEqual({
      title: 'Cabaña del Bosque',
      description: 'Cabaña con chimenea',
      city: 'Guatapé',
      department: 'Antioquia',
      address: 'Vereda El Roble',
      propertyType: 'CABANA',
      maxGuests: 4,
      pricePerNight: 320000,
      amenities: ['WIFI'],
      rules: ['No fumar', 'No fiestas'],
      images: ['https://img/1.jpg'],
    });
    expect(component.saved?.status).toBe('BORRADOR');
    expect(component.myListings[0].id).toBe('listing-1');
  });

  it('HU-039 CA1 y CA2: dispone de la política Flexible en el catálogo (100 % hasta 48 h antes y 50 % después con ejemplo de fechas) y permite asociarla a la publicación', async () => {
    fetchSpy.and.returnValue(jsonResponse(CANCELLATION_POLICIES_CATALOG, 200));
    await component.loadCancellationPolicies();

    expect(component.cancellationPolicies).toHaveSize(1);
    expect(component.cancellationPolicies[0].code).toBe('FLEXIBLE');
    expect(component.cancellationPolicies[0].rules).toEqual([
      { minHoursBeforeCheckIn: 48, refundPercentage: 100 },
      { minHoursBeforeCheckIn: 0, refundPercentage: 50 },
    ]);
    expect(component.selectedCancellationPolicy?.description).toContain('Por ejemplo, si tu llegada es el 15 de noviembre');

    component.form.title = 'Cabaña con política Flexible';
    component.selectCancellationPolicy('FLEXIBLE');

    expect(component.buildPayload()['cancellationPolicy']).toBe('FLEXIBLE');
  });

  it('HU-017 CA2: si no se elige política, el payload no incluye cancellationPolicy para que se asigne Flexible por defecto al activar', () => {
    component.selectCancellationPolicy('');
    expect(component.form.cancellationPolicy).toBe('');
    expect(component.selectedCancellationPolicy).toBeNull();
    expect(component.buildPayload()['cancellationPolicy']).toBeUndefined();
  });

  it('CA2: rechaza capacidad 0 y precio menor o igual a 0 con mensaje junto al campo', async () => {
    component.form.title = 'Cabaña del Bosque';
    component.form.maxGuests = 0;
    component.form.pricePerNight = -1;

    await component.save();

    expect(component.errors.maxGuests).toBe('La capacidad debe ser mayor que 0.');
    expect(component.errors.pricePerNight).toBe('El precio por noche debe ser mayor que 0.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('CA2: muestra junto al campo los errores devueltos por la API', async () => {
    fetchSpy.and.returnValue(
      jsonResponse(
        { message: ['La capacidad debe ser mayor que 0'], fieldErrors: { maxGuests: ['La capacidad debe ser mayor que 0'] } },
        400,
      ),
    );
    component.form.title = 'Cabaña del Bosque';

    await component.save();

    expect(component.errors).toEqual({ maxGuests: 'La capacidad debe ser mayor que 0' });
  });

  it('CA3: informa que un huésped no puede crear publicaciones', async () => {
    fetchSpy.and.returnValue(jsonResponse({ message: 'Acceso denegado' }, 403));
    component.form.title = 'Intento de huésped';

    await component.save();

    expect(component.errors.form).toBe('Solo los anfitriones pueden crear publicaciones.');
    expect(component.saved).toBeNull();
  });

  it('CA4: con solo el título envía únicamente ese campo y muestra la marca de incompleta', async () => {
    fetchSpy.and.returnValue(
      jsonResponse(
        {
          id: 'listing-2',
          title: 'Apartamento en Laureles',
          status: 'BORRADOR',
          isComplete: false,
          missingFields: ['description', 'pricePerNight'],
          createdAt: '',
        },
        201,
      ),
    );
    component.form.title = 'Apartamento en Laureles';

    await component.save();

    expect(JSON.parse(fetchSpy.calls.mostRecent().args[1].body)).toEqual({
      title: 'Apartamento en Laureles',
      amenities: [],
      rules: [],
      images: [],
    });
    expect(component.saved?.isComplete).toBeFalse();
    expect(component.missingLabels(component.saved!.missingFields)).toBe('descripción, precio por noche');
  });

  it('CA4: exige el título antes de guardar', async () => {
    await component.save();
    expect(component.errors.title).toBe('El título es obligatorio.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('permite marcar y desmarcar servicios', () => {
    component.toggleAmenity('WIFI');
    component.toggleAmenity('PISCINA');
    component.toggleAmenity('WIFI');
    expect(component.form.amenities).toEqual(['PISCINA']);
  });

  describe('Precio por noche en pesos colombianos', () => {
    it('muestra el signo pesos y los puntos de miles', () => {
      expect(formatCop(320000)).toBe('$ 320.000');
      expect(formatCop(1250000)).toBe('$ 1.250.000');
      expect(formatCop(null)).toBe('');
    });

    it('lee solo los dígitos de lo que se escribe', () => {
      expect(parseCop('$ 320.000')).toBe(320000);
      expect(parseCop('abc')).toBeNull();
      expect(parseCop('12345678901')).toBe(123456789);
    });

    it('al escribir guarda el número y reescribe el campo con formato', () => {
      const input = document.createElement('input');
      input.value = '$ 32.0000';

      component.onPriceInput({ target: input } as unknown as Event);

      expect(component.form.pricePerNight).toBe(320000);
      expect(input.value).toBe('$ 320.000');
      expect(component.buildPayload()['pricePerNight']).toBe(320000);
    });

    it('un precio de $ 0 sigue mostrando el error de precio', async () => {
      component.form.title = 'Cabaña del Bosque';
      const input = document.createElement('input');
      input.value = '0';
      component.onPriceInput({ target: input } as unknown as Event);

      await component.save();

      expect(component.errors.pricePerNight).toBe('El precio por noche debe ser mayor que 0.');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Imágenes subidas desde el dispositivo', () => {
    const image = (name = 'sala.jpg', type = 'image/jpeg', size = 1024) =>
      new File([new Uint8Array(size)], name, { type });

    it('sube las imágenes con el token del anfitrión y muestra su vista previa', async () => {
      fetchSpy.and.returnValue(jsonResponse({ urls: ['/api/listings/images/a.jpg', '/api/listings/images/b.png'] }, 201));

      await component.uploadImages([image('sala.jpg'), image('cocina.png', 'image/png')]);

      const [url, init] = fetchSpy.calls.mostRecent().args;
      expect(url).toBe('/api/listings/images');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ Authorization: 'Bearer jwt-host' });
      expect((init.body as FormData).getAll('images').length).toBe(2);
      expect(component.uploadedImages).toEqual(['/api/listings/images/a.jpg', '/api/listings/images/b.png']);
    });

    it('envía las imágenes subidas y los enlaces pegados al guardar', async () => {
      component.uploadedImages = ['/api/listings/images/a.jpg'];
      component.form.imagesText = 'https://img/2.jpg';

      expect(component.buildPayload()['images']).toEqual(['/api/listings/images/a.jpg', 'https://img/2.jpg']);
    });

    it('rechaza otros formatos, archivos de más de 5 MB y más de 10 imágenes sin llamar al API', async () => {
      await component.uploadImages([image('plano.pdf', 'application/pdf')]);
      expect(component.imageError).toContain('no es una imagen JPG, PNG o WEBP');

      await component.uploadImages([image('grande.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1)]);
      expect(component.imageError).toContain('supera el tamaño máximo de 5 MB');

      component.uploadedImages = Array.from({ length: 10 }, (_, i) => `/api/listings/images/${i}.jpg`);
      await component.uploadImages([image()]);
      expect(component.imageError).toContain('hasta 10 imágenes');

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('muestra el error del API y conserva las imágenes ya subidas', async () => {
      component.uploadedImages = ['/api/listings/images/a.jpg'];
      fetchSpy.and.returnValue(jsonResponse({ message: '«falsa.jpg» no es una imagen JPG, PNG o WEBP' }, 400));

      await component.uploadImages([image('falsa.jpg')]);

      expect(component.imageError).toBe('«falsa.jpg» no es una imagen JPG, PNG o WEBP');
      expect(component.uploadedImages).toEqual(['/api/listings/images/a.jpg']);
      expect(component.uploading).toBeFalse();
    });

    it('permite quitar una imagen y empezar una publicación nueva sin imágenes', () => {
      component.uploadedImages = ['/api/listings/images/a.jpg', '/api/listings/images/b.jpg'];

      component.removeImage('/api/listings/images/a.jpg');
      expect(component.uploadedImages).toEqual(['/api/listings/images/b.jpg']);

      component.startNew();
      expect(component.uploadedImages).toEqual([]);
    });
  });
});
