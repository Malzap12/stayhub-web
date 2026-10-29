import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdditionalServicesManagerComponent } from './additional-services-manager.component';
import { SESSION_STORAGE_KEY } from '../../core/guards/auth.guard';
import { AdditionalService, cleanServiceName, validateAdditionalService } from '../../shared/models/additional-service.model';

describe('AdditionalServicesManagerComponent · HU-016', () => {
  let fixture: ComponentFixture<AdditionalServicesManagerComponent>;
  let component: AdditionalServicesManagerComponent;
  let fetchSpy: jasmine.Spy;

  const services: AdditionalService[] = [
    { id: 'svc-1', name: 'Desayuno para dos', cost: 45000 },
    { id: 'svc-2', name: 'Traslado desde el aeropuerto', cost: 80000 },
  ];
  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const lastCall = () => fetchSpy.calls.mostRecent().args as [string, RequestInit];

  beforeEach(async () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ token: 'jwt-host', email: 'host@prueba.com', name: 'Anfitriona', role: 'ANFITRION', expiresAt: Date.now() + 60_000 }),
    );
    await TestBed.configureTestingModule({ imports: [AdditionalServicesManagerComponent] }).compileComponents();
    fixture = TestBed.createComponent(AdditionalServicesManagerComponent);
    component = fixture.componentInstance;
    component.listingId = 'listing-1';
    fetchSpy = spyOn(window, 'fetch').and.returnValue(json(services.map((item) => ({ ...item }))));
  });

  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  it('carga los servicios de la publicación con el token del anfitrión y los muestra con su costo', async () => {
    const element = await render();

    const [url, init] = lastCall();
    expect(url).toBe('/api/listings/listing-1/additional-services');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer jwt-host');
    const items = element.querySelectorAll('.service-item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Desayuno para dos');
    expect(items[0].textContent).toContain('45.000');
  });

  it('CA1: agrega un servicio con nombre y costo mayor que 0', async () => {
    await render();
    fetchSpy.and.returnValue(json([...services, { id: 'svc-3', name: 'Tour guiado', cost: 60000 }]));
    component.newName = '  Tour   guiado ';
    component.newCost = 60000;

    await component.add();

    const [url, init] = lastCall();
    expect(url).toBe('/api/listings/listing-1/additional-services');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'Tour guiado', cost: 60000 });
    expect(component.services.length).toBe(3);
    expect(component.successMessage).toContain('«Tour guiado» quedó disponible');
    expect(component.newName).toBe('');
  });

  it('CA1: no llama al API si el costo es 0 o el nombre se repite', async () => {
    await render();
    const calls = fetchSpy.calls.count();
    component.newName = 'DESAYUNO PARA DOS';
    component.newCost = 0;

    await component.add();

    expect(fetchSpy.calls.count()).toBe(calls);
    expect(component.newErrors).toEqual({ name: 'Ya ofreces un servicio con ese nombre.', cost: 'El costo debe ser mayor que 0 COP.' });
  });

  it('CA2: modifica el costo de un servicio y avisa que aplica a cotizaciones nuevas', async () => {
    await render();
    fetchSpy.and.returnValue(json([{ ...services[0], cost: 60000 }, services[1]]));
    component.startEdit(services[0]);
    component.editCost = 60000;

    await component.saveEdit(services[0]);

    const [url, init] = lastCall();
    expect(url).toBe('/api/listings/listing-1/additional-services/svc-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'Desayuno para dos', cost: 60000 });
    expect(component.services[0].cost).toBe(60000);
    expect(component.editingId).toBeNull();
    expect(component.successMessage).toContain('cotizaciones nuevas');
  });

  it('CA2: al editar puede conservar su propio nombre, pero no tomar el de otro servicio', async () => {
    await render();
    component.startEdit(services[0]);
    component.editName = 'traslado desde el aeropuerto';
    const calls = fetchSpy.calls.count();

    await component.saveEdit(services[0]);

    expect(fetchSpy.calls.count()).toBe(calls);
    expect(component.editErrors.name).toBe('Ya ofreces un servicio con ese nombre.');
    expect(validateAdditionalService('Desayuno para dos', 1000, services, 'svc-1')).toEqual({});
  });

  it('CA2: elimina un servicio tras confirmar', async () => {
    const element = await render();
    (element.querySelector('.service-item .btn-delete') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('.btn-confirm-delete')).not.toBeNull();
    fetchSpy.and.returnValue(json([services[1]]));

    await component.remove(services[0]);

    const [url, init] = lastCall();
    expect(url).toBe('/api/listings/listing-1/additional-services/svc-1');
    expect(init.method).toBe('DELETE');
    expect(component.services.map((item) => item.id)).toEqual(['svc-2']);
    expect(component.successMessage).toContain('conservan');
  });

  it('muestra el error del API y conserva la lista', async () => {
    await render();
    fetchSpy.and.returnValue(json({ message: 'Una publicación admite máximo 10 servicios adicionales' }, 400));
    component.newName = 'Servicio nuevo';
    component.newCost = 1000;

    await component.add();

    expect(component.errorMessage).toBe('Una publicación admite máximo 10 servicios adicionales');
    expect(component.services.length).toBe(2);
  });

  it('valida nombres y costos como el servidor', () => {
    expect(cleanServiceName('  Desayuno   para dos ')).toBe('Desayuno para dos');
    expect(validateAdditionalService('ab', 1000, []).name).toBeDefined();
    expect(validateAdditionalService('Tour', null, []).cost).toBeDefined();
    expect(validateAdditionalService('Tour', 20_000_000, []).cost).toContain('10.000.000');
    expect(validateAdditionalService('Tour guiado', 60000, [])).toEqual({});
  });
});
