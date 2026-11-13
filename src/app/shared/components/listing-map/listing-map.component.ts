import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

interface TileItem {
  key: string;
  url: string;
  left: number;
  top: number;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;
const DEFAULT_LAT = 4.64862;
const DEFAULT_LNG = -74.06285;
const MAX_MERCATOR_LAT = 85.05112878;

export function clampLatitude(lat: number): number {
  return Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
}

export function normalizeLongitude(lng: number): number {
  const clamped = Math.max(-180, Math.min(180, lng));
  return Number(clamped.toFixed(6));
}

export function latLngToPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((clampLatitude(lat) * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function pixelToLatLng(x: number, y: number, zoom: number): MapCoordinates {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    latitude: Number(Math.max(-90, Math.min(90, lat)).toFixed(6)),
    longitude: normalizeLongitude(lng),
  };
}

/**
 * Mapa interactivo basado en OpenStreetMap (teselas públicas + proyección Web Mercator).
 * Permite acercar, alejar, desplazar y, en modo editable, ubicar o corregir el marcador.
 */
@Component({
  selector: 'app-listing-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-frame" *ngIf="!failed; else mapErrorTpl" [class.editable]="editable">
      <div
        class="map-viewport"
        role="application"
        [attr.aria-label]="ariaLabel"
        (pointerdown)="onViewportPointerDown($event)"
        (pointermove)="onViewportPointerMove($event)"
        (pointerup)="onViewportPointerUp($event)"
        (pointerleave)="onViewportPointerCancel()"
        (click)="onViewportClick($event)"
      >
        <div class="tiles-layer" aria-hidden="true">
          <img
            *ngFor="let tile of tiles; trackBy: trackTile"
            class="map-tile"
            [src]="tile.url"
            [style.left.px]="tile.left"
            [style.top.px]="tile.top"
            alt=""
            draggable="false"
            (load)="onTileLoad()"
            (error)="onTileError()"
          />
        </div>

        <div
          *ngIf="hasMarker"
          class="map-marker"
          [class.draggable]="editable"
          [style.left.px]="markerOffset.x"
          [style.top.px]="markerOffset.y"
          role="img"
          aria-label="Ubicación del alojamiento"
          (pointerdown)="onMarkerPointerDown($event)"
          (click)="$event.stopPropagation()"
        >
          <span class="pin-head"></span>
          <span class="pin-stem"></span>
        </div>
      </div>

      <div class="map-controls" aria-label="Controles del mapa">
        <button
          type="button"
          class="ctrl-btn zoom-in-btn"
          (click)="zoomIn()"
          [disabled]="zoom >= maxZoom"
          aria-label="Acercar mapa"
          title="Acercar"
        >+</button>
        <button
          type="button"
          class="ctrl-btn zoom-out-btn"
          (click)="zoomOut()"
          [disabled]="zoom <= minZoom"
          aria-label="Alejar mapa"
          title="Alejar"
        >−</button>
        <button
          *ngIf="hasMarker"
          type="button"
          class="ctrl-btn center-btn"
          (click)="centerOnMarker()"
          aria-label="Centrar en el marcador"
          title="Centrar"
        >◎</button>
      </div>

      <div class="map-attribution">
        <span>{{ attributionText }}</span>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
      </div>
    </div>

    <ng-template #mapErrorTpl>
      <div class="map-fallback" role="status">
        No fue posible cargar el mapa en este momento. Consulta la ubicación escrita en el detalle.
      </div>
    </ng-template>
  `,
  styles: [`
    .map-frame {
      position: relative;
      width: 100%;
      height: 300px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.12);
      background: #e9eef2;
      user-select: none;
    }
    .map-frame.editable {
      height: 280px;
    }
    .map-viewport {
      position: relative;
      width: 100%;
      height: 100%;
      cursor: grab;
      touch-action: none;
      overflow: hidden;
    }
    .map-viewport:active {
      cursor: grabbing;
    }
    .map-frame.editable .map-viewport {
      cursor: crosshair;
    }
    .tiles-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .map-tile {
      position: absolute;
      width: 256px;
      height: 256px;
      max-width: none;
      display: block;
    }
    .map-marker {
      position: absolute;
      transform: translate(-50%, -100%);
      z-index: 3;
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
    }
    .map-marker.draggable {
      cursor: move;
    }
    .pin-head {
      width: 22px;
      height: 22px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      background: #e11d48;
      border: 2.5px solid #ffffff;
    }
    .pin-stem {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.35);
      margin-top: 2px;
    }
    .map-controls {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 4;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ctrl-btn {
      width: 34px;
      height: 34px;
      border: 1px solid rgba(0, 0, 0, 0.16);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.96);
      color: #1d1d1f;
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      display: grid;
      place-items: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }
    .ctrl-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .map-attribution {
      position: absolute;
      bottom: 8px;
      right: 8px;
      z-index: 4;
      background: rgba(255, 255, 255, 0.92);
      color: #222222;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.72rem;
      display: flex;
      gap: 6px;
      align-items: center;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    }
    .map-attribution a {
      color: #0066cc;
      text-decoration: underline;
    }
    .map-fallback {
      padding: 14px 16px;
      border-radius: 12px;
      background: #f5f5f7;
      color: #6a6a6a;
      font-size: 0.9rem;
      border: 1px dashed #d2d2d7;
    }
  `],
})
export class ListingMapComponent implements OnChanges {
  @Input() latitude: number | null = null;
  @Input() longitude: number | null = null;
  @Input() editable = false;
  @Input() attribution = '© OpenStreetMap contributors';
  @Input() ariaLabel = 'Mapa interactivo de ubicación';
  @Input() forceError = false;
  @Input() zoom = 15;

  @Output() coordinatesChange = new EventEmitter<MapCoordinates>();
  @Output() mapError = new EventEmitter<void>();

  readonly minZoom = MIN_ZOOM;
  readonly maxZoom = MAX_ZOOM;

  centerLat = DEFAULT_LAT;
  centerLng = DEFAULT_LNG;
  tiles: TileItem[] = [];
  markerOffset = { x: 240, y: 150 };
  failed = false;

  private readonly viewportWidth = 640;
  private readonly viewportHeight = 300;
  private draggingMap = false;
  private draggingMarker = false;
  private dragMoved = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartCenterPixel = { x: 0, y: 0 };
  private tileLoadSuccessCount = 0;
  private tileErrorCount = 0;

  get hasMarker(): boolean {
    return (
      this.latitude !== null &&
      this.longitude !== null &&
      Number.isFinite(this.latitude) &&
      Number.isFinite(this.longitude)
    );
  }

  get attributionText(): string {
    return this.attribution?.trim() || '© OpenStreetMap contributors';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.forceError) {
      this.triggerError();
      return;
    }
    if (changes['latitude'] || changes['longitude']) {
      if (this.hasMarker) {
        this.centerLat = this.latitude!;
        this.centerLng = this.longitude!;
      }
    }
    this.failed = false;
    this.recomputeLayout();
  }

  zoomIn(): void {
    if (this.zoom < this.maxZoom) {
      this.zoom += 1;
      this.recomputeLayout();
    }
  }

  zoomOut(): void {
    if (this.zoom > this.minZoom) {
      this.zoom -= 1;
      this.recomputeLayout();
    }
  }

  centerOnMarker(): void {
    if (this.hasMarker) {
      this.centerLat = this.latitude!;
      this.centerLng = this.longitude!;
      this.recomputeLayout();
    }
  }

  panBy(dx: number, dy: number): void {
    const centerPx = latLngToPixel(this.centerLat, this.centerLng, this.zoom);
    const next = pixelToLatLng(centerPx.x - dx, centerPx.y - dy, this.zoom);
    this.centerLat = next.latitude;
    this.centerLng = next.longitude;
    this.recomputeLayout();
  }

  onMarkerPointerDown(event: PointerEvent): void {
    if (!this.editable) {
      return;
    }
    event.stopPropagation();
    this.draggingMarker = true;
    this.draggingMap = false;
    this.dragMoved = false;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
  }

  onViewportPointerDown(event: PointerEvent): void {
    this.draggingMap = true;
    this.draggingMarker = false;
    this.dragMoved = false;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartCenterPixel = latLngToPixel(this.centerLat, this.centerLng, this.zoom);
  }

  onViewportPointerMove(event: PointerEvent): void {
    if (!this.draggingMap && !this.draggingMarker) {
      return;
    }
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      this.dragMoved = true;
    }

    if (this.draggingMarker && this.editable) {
      const target = event.currentTarget as HTMLElement | null;
      const coords = this.clientPointToLatLng(event.clientX, event.clientY, target);
      if (coords) {
        this.emitCoordinates(coords);
      }
      return;
    }

    if (this.draggingMap) {
      const next = pixelToLatLng(this.dragStartCenterPixel.x - dx, this.dragStartCenterPixel.y - dy, this.zoom);
      this.centerLat = next.latitude;
      this.centerLng = next.longitude;
      this.recomputeLayout();
    }
  }

  onViewportPointerUp(event: PointerEvent): void {
    if (this.draggingMarker && this.editable) {
      const target = event.currentTarget as HTMLElement | null;
      const coords = this.clientPointToLatLng(event.clientX, event.clientY, target);
      if (coords) {
        this.emitCoordinates(coords);
      }
    }
    this.draggingMap = false;
    this.draggingMarker = false;
  }

  onViewportPointerCancel(): void {
    this.draggingMap = false;
    this.draggingMarker = false;
  }

  onViewportClick(event: MouseEvent): void {
    if (!this.editable || this.dragMoved) {
      return;
    }
    const target = event.currentTarget as HTMLElement | null;
    const coords = this.clientPointToLatLng(event.clientX, event.clientY, target);
    if (coords) {
      this.emitCoordinates(coords);
    }
  }

  onTileLoad(): void {
    this.tileLoadSuccessCount += 1;
  }

  onTileError(): void {
    this.tileErrorCount += 1;
    if (!this.editable && this.tileLoadSuccessCount === 0 && this.tileErrorCount >= this.tiles.length && this.tiles.length > 0) {
      this.triggerError();
    }
  }

  trackTile(_index: number, item: TileItem): string {
    return item.key;
  }

  private triggerError(): void {
    if (!this.failed) {
      this.failed = true;
      this.mapError.emit();
    }
  }

  private emitCoordinates(coords: MapCoordinates): void {
    this.latitude = coords.latitude;
    this.longitude = coords.longitude;
    this.recomputeLayout();
    this.coordinatesChange.emit(coords);
  }

  private clientPointToLatLng(clientX: number, clientY: number, container: HTMLElement | null): MapCoordinates | null {
    if (!container) {
      return null;
    }
    const rect = container.getBoundingClientRect();
    const width = rect.width || this.viewportWidth;
    const height = rect.height || this.viewportHeight;
    const relX = clientX - rect.left - width / 2;
    const relY = clientY - rect.top - height / 2;
    const centerPx = latLngToPixel(this.centerLat, this.centerLng, this.zoom);
    return pixelToLatLng(centerPx.x + relX, centerPx.y + relY, this.zoom);
  }

  private recomputeLayout(): void {
    const centerPx = latLngToPixel(this.centerLat, this.centerLng, this.zoom);
    const centerTileX = Math.floor(centerPx.x / TILE_SIZE);
    const centerTileY = Math.floor(centerPx.y / TILE_SIZE);
    const maxTileIndex = Math.pow(2, this.zoom);
    const halfW = this.viewportWidth / 2;
    const halfH = this.viewportHeight / 2;

    const nextTiles: TileItem[] = [];
    for (let dx = -2; dx <= 2; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const ty = centerTileY + dy;
        if (ty < 0 || ty >= maxTileIndex) {
          continue;
        }
        const tx = ((centerTileX + dx) % maxTileIndex + maxTileIndex) % maxTileIndex;
        const left = halfW + ((centerTileX + dx) * TILE_SIZE - centerPx.x);
        const top = halfH + (ty * TILE_SIZE - centerPx.y);
        nextTiles.push({
          key: `${this.zoom}-${tx}-${ty}-${dx}-${dy}`,
          url: `https://tile.openstreetmap.org/${this.zoom}/${tx}/${ty}.png`,
          left,
          top,
        });
      }
    }
    this.tiles = nextTiles;

    if (this.hasMarker) {
      const markerPx = latLngToPixel(this.latitude!, this.longitude!, this.zoom);
      this.markerOffset = {
        x: halfW + (markerPx.x - centerPx.x),
        y: halfH + (markerPx.y - centerPx.y),
      };
    }
  }
}
