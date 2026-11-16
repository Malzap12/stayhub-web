import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import {
  ListingMapComponent,
  latLngToPixel,
  pixelToLatLng,
} from './listing-map.component';

describe('ListingMapComponent (HU-069)', () => {
  let fixture: ComponentFixture<ListingMapComponent>;
  let component: ListingMapComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingMapComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListingMapComponent);
    component = fixture.componentInstance;
    component.latitude = 6.2442;
    component.longitude = -75.5812;
    component.ngOnChanges({
      latitude: new SimpleChange(null, 6.2442, true),
      longitude: new SimpleChange(null, -75.5812, true),
    });
    fixture.detectChanges();
  });

  it('permite acercar, alejar y desplazar el mapa mostrando marcador y atribución OpenStreetMap', () => {
    const initialZoom = component.zoom;
    component.zoomIn();
    expect(component.zoom).toBe(initialZoom + 1);

    component.zoomOut();
    expect(component.zoom).toBe(initialZoom);

    const prevLat = component.centerLat;
    component.panBy(40, 40);
    expect(component.centerLat).not.toBe(prevLat);

    component.centerOnMarker();
    expect(component.centerLat).toBe(6.2442);

    const hostText = fixture.nativeElement.textContent ?? '';
    expect(hostText).toContain('OpenStreetMap');
    expect(fixture.nativeElement.querySelector('.map-marker')).toBeTruthy();
  });

  it('en modo editable emite nuevas coordenadas al hacer clic en el mapa', () => {
    component.editable = true;
    fixture.detectChanges();

    const emitted: Array<{ latitude: number; longitude: number }> = [];
    component.coordinatesChange.subscribe((coords) => emitted.push(coords));

    const viewport = fixture.nativeElement.querySelector('.map-viewport') as HTMLElement;
    spyOn(viewport, 'getBoundingClientRect').and.returnValue({
      left: 0,
      top: 0,
      width: 600,
      height: 280,
      right: 600,
      bottom: 280,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    component.onViewportClick({
      clientX: 360,
      clientY: 180,
      currentTarget: viewport,
    } as unknown as MouseEvent);

    expect(emitted.length).toBe(1);
    expect(emitted[0].latitude).toBeGreaterThanOrEqual(-90);
    expect(emitted[0].latitude).toBeLessThanOrEqual(90);
    expect(emitted[0].longitude).toBeGreaterThanOrEqual(-180);
    expect(emitted[0].longitude).toBeLessThanOrEqual(180);
  });

  it('emite mapError y muestra respaldo cuando falla la carga del mapa', () => {
    let errorCount = 0;
    component.mapError.subscribe(() => {
      errorCount += 1;
    });

    component.forceError = true;
    component.ngOnChanges({ forceError: new SimpleChange(false, true, false) });
    fixture.detectChanges();

    expect(errorCount).toBe(1);
    expect(component.failed).toBeTrue();
  });

  it('convierte ida y vuelta entre coordenadas geográficas y píxeles Mercator', () => {
    const px = latLngToPixel(4.64862, -74.06285, 14);
    const back = pixelToLatLng(px.x, px.y, 14);
    expect(back.latitude).toBeCloseTo(4.64862, 4);
    expect(back.longitude).toBeCloseTo(-74.06285, 4);
  });
});
