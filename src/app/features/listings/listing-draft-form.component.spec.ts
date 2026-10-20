import { ListingDraftFormComponent } from './listing-draft-form.component';
import { clearActiveSession, SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';

describe('ListingDraftFormComponent (HU-010 · Crear una publicación en borrador)', () => {
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
    localStorage.setItem(
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
});
