import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyListingsComponent } from './my-listings.component';
import { MyListing } from '../../shared/models/listing.model';

describe('MyListingsComponent · HU-012', () => {
  let component: MyListingsComponent;
  let fixture: ComponentFixture<MyListingsComponent>;
  let element: HTMLElement;

  const listings: MyListing[] = [
    {
      id: 'listing-1',
      title: 'Cabaña del Bosque',
      city: 'Guatapé',
      pricePerNight: 320000,
      status: 'BORRADOR',
      statusLabel: 'Borrador',
      adminReasonType: 'DEVUELTA',
      adminReason: 'Las fotografías están oscuras.',
      isComplete: true,
      missingFields: [],
      createdAt: '2026-10-20T10:00:00.000Z',
    },
    {
      id: 'listing-2',
      title: 'Ático en Laureles',
      city: 'Medellín',
      pricePerNight: 290000,
      status: 'BLOQUEADA',
      statusLabel: 'Bloqueada',
      adminReasonType: 'BLOQUEADA',
      adminReason: 'Fotografías que no corresponden al inmueble.',
      isComplete: true,
      missingFields: [],
      createdAt: '2026-10-19T10:00:00.000Z',
    },
    {
      id: 'listing-3',
      title: 'Apartamento sin terminar',
      status: 'BORRADOR',
      statusLabel: 'Borrador',
      isComplete: false,
      missingFields: ['city', 'pricePerNight'],
      createdAt: '2026-10-18T10:00:00.000Z',
    },
  ];

  const respondWith = (status: number, body: unknown) =>
    spyOn(window, 'fetch').and.resolveTo(new Response(JSON.stringify(body), { status }));

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyListingsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MyListingsComponent);
    component = fixture.componentInstance;
  });

  it('CA1: muestra cada publicación con título, ciudad, precio y estado', async () => {
    respondWith(200, listings);
    await render();

    const cards = element.querySelectorAll('.listing-card');
    expect(cards).toHaveSize(3);
    expect(cards[0].textContent).toContain('Cabaña del Bosque');
    expect(cards[0].textContent).toContain('Guatapé');
    expect(cards[0].textContent).toContain('320.000');
    expect(cards[0].querySelector('.status-badge')?.textContent?.trim()).toBe('Borrador');
  });

  it('CA1: un borrador sin ciudad ni precio indica que están pendientes', async () => {
    respondWith(200, listings);
    await render();

    const draft = element.querySelectorAll('.listing-card')[2];
    expect(draft.textContent).toContain('Ciudad pendiente');
    expect(draft.textContent).toContain('Precio pendiente');
  });

  it('CA2: muestra el motivo del administrador en publicaciones devueltas o bloqueadas', async () => {
    respondWith(200, listings);
    await render();

    const reasons = element.querySelectorAll('.admin-reason');
    expect(reasons).toHaveSize(2);
    expect(reasons[0].textContent).toContain('Devuelta por el administrador');
    expect(reasons[0].textContent).toContain('Las fotografías están oscuras.');
    expect(reasons[1].classList).toContain('blocked');
    expect(reasons[1].textContent).toContain('Fotografías que no corresponden al inmueble.');
  });

  it('filtra el listado por estado', async () => {
    respondWith(200, listings);
    await render();

    expect(component.filterOptions.map((option) => option.label)).toEqual(['Todas', 'Borrador', 'Bloqueada']);
    component.filter = 'BLOQUEADA';
    expect(component.visibleListings.map((item) => item.id)).toEqual(['listing-2']);
  });

  it('sin publicaciones invita a crear la primera', async () => {
    respondWith(200, []);
    await render();

    expect(element.querySelector('.empty-state')?.textContent).toContain('Aún no tienes publicaciones');
  });

  it('informa cuando la sesión expiró', async () => {
    respondWith(401, {});
    await render();

    expect(component.errorMessage).toContain('Tu sesión expiró');
    expect(element.querySelector('.listing-card')).toBeNull();
  });
});
