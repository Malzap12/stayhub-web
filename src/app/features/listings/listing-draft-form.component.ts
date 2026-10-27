import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';

export type PropertyType = 'CASA' | 'APARTAMENTO' | 'CABANA' | 'FINCA' | 'HABITACION' | 'OTRO';
export type CancellationPolicyCode = 'FLEXIBLE';

export interface CancellationPolicyOption {
  code: CancellationPolicyCode;
  name: string;
  description: string;
  rules: Array<{ minHoursBeforeCheckIn: number; refundPercentage: number }>;
}

/**
 * HU-039 · Catálogo de políticas de cancelación (CA1, CA2, RF-058, RN-016).
 * CA1: Política Flexible con 100 % de devolución hasta 48 h antes de la llegada y 50 % después.
 * CA2: Su texto explica la regla con un ejemplo de fechas.
 */
export const CANCELLATION_POLICIES_CATALOG: CancellationPolicyOption[] = [
  {
    code: 'FLEXIBLE',
    name: 'Flexible',
    description:
      'Reembolso del 100 % si cancelas hasta 48 horas antes de la llegada y del 50 % después. Por ejemplo, si tu llegada es el 15 de noviembre a las 15:00, recibes el 100 % de devolución si cancelas hasta el 13 de noviembre a las 15:00 y el 50 % si cancelas entre el 13 y el 15 de noviembre antes del check-in.',
    rules: [
      { minHoursBeforeCheckIn: 48, refundPercentage: 100 },
      { minHoursBeforeCheckIn: 0, refundPercentage: 50 },
    ],
  },
];

export interface ListingDraftForm {
  title: string;
  description: string;
  city: string;
  department: string;
  address: string;
  propertyType: PropertyType | '';
  maxGuests: number | null;
  pricePerNight: number | null;
  amenities: string[];
  rulesText: string;
  imagesText: string;
  cancellationPolicy?: CancellationPolicyCode | '';
}

export interface SavedDraft {
  id: string;
  title: string;
  status: string;
  isComplete: boolean;
  missingFields: string[];
  createdAt: string;
}

export type DraftField = 'title' | 'maxGuests' | 'pricePerNight' | 'form';

/** HU-010: límites que también valida el API al subir imágenes. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 10;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PRICE_DIGITS = 9;

const copFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** Precio en pesos con signo y separador de miles: 320000 -> "$ 320.000". */
export function formatCop(value: number | null): string {
  return value === null ? '' : `$ ${copFormatter.format(value)}`;
}

/** Lee lo que escribe el usuario ("$ 320.000", "320000") y deja solo el valor entero. */
export function parseCop(text: string): number | null {
  const digits = text.replace(/\D/g, '').slice(0, MAX_PRICE_DIGITS);
  return digits ? Number(digits) : null;
}

const emptyForm = (): ListingDraftForm => ({
  title: '',
  description: '',
  city: '',
  department: '',
  address: '',
  propertyType: '',
  maxGuests: null,
  pricePerNight: null,
  amenities: [],
  rulesText: '',
  imagesText: '',
});

@Component({
  selector: 'app-listing-draft-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="draft-shell">
      <header class="draft-header">
        <span class="eyebrow">HU-010 · Panel de Anfitrión (EP-03)</span>
        <h1>Nueva publicación</h1>
        <p class="subtitle">
          Guarda tu alojamiento como <strong>borrador</strong>. Solo el título es obligatorio: puedes completar el resto después.
        </p>
        <a routerLink="/anfitrion/publicaciones" class="back-link">← Volver al panel</a>
      </header>

      <div *ngIf="saved" class="alert" [class.alert-success]="saved.isComplete" [class.alert-warning]="!saved.isComplete" role="status">
        <strong>«{{ saved.title }}» quedó guardada en BORRADOR.</strong>
        <span *ngIf="saved.isComplete">Tiene toda la información básica.</span>
        <span *ngIf="!saved.isComplete">
          Marcada como <b>incompleta</b>. Falta: {{ missingLabels(saved.missingFields) }}.
        </span>
        <button type="button" class="link-btn" (click)="startNew()">Crear otra publicación</button>
      </div>

      <div *ngIf="errors.form" class="alert alert-error" role="alert">{{ errors.form }}</div>

      <div class="workspace">
        <form class="form-card" (ngSubmit)="save()" novalidate aria-label="Formulario de nueva publicación">
          <div class="field">
            <label for="draft-title">Título <span class="required" aria-hidden="true">*</span></label>
            <input
              id="draft-title"
              name="title"
              [(ngModel)]="form.title"
              placeholder="Ej. Cabaña del Bosque en Guatapé"
              maxlength="100"
              [class.input-error]="errors.title"
              [attr.aria-invalid]="!!errors.title"
              aria-describedby="draft-title-error"
            />
            <p *ngIf="errors.title" id="draft-title-error" class="field-error" role="alert">{{ errors.title }}</p>
          </div>

          <div class="field">
            <label for="draft-description">Descripción</label>
            <textarea id="draft-description" name="description" rows="3" [(ngModel)]="form.description"></textarea>
          </div>

          <div class="grid-2">
            <div class="field">
              <label for="draft-department">Departamento</label>
              <select id="draft-department" name="department" [(ngModel)]="form.department">
                <option value="">Selecciona…</option>
                <option *ngFor="let item of departments" [value]="item">{{ item }}</option>
              </select>
            </div>
            <div class="field">
              <label for="draft-city">Ciudad o municipio</label>
              <input id="draft-city" name="city" [(ngModel)]="form.city" placeholder="Ej. Guatapé" />
            </div>
          </div>

          <div class="field">
            <label for="draft-address">Dirección o referencia</label>
            <input
              id="draft-address"
              name="address"
              [(ngModel)]="form.address"
              placeholder="Ej. Vereda El Roble, a 2 km del parque principal"
            />
          </div>

          <div class="grid-3">
            <div class="field">
              <label for="draft-type">Tipo</label>
              <select id="draft-type" name="propertyType" [(ngModel)]="form.propertyType">
                <option value="">Selecciona…</option>
                <option *ngFor="let item of propertyTypes" [value]="item.value">{{ item.label }}</option>
              </select>
            </div>
            <div class="field">
              <label for="draft-capacity">Capacidad (huéspedes)</label>
              <input
                id="draft-capacity"
                name="maxGuests"
                type="number"
                min="1"
                step="1"
                [(ngModel)]="form.maxGuests"
                [class.input-error]="errors.maxGuests"
                [attr.aria-invalid]="!!errors.maxGuests"
                aria-describedby="draft-capacity-error"
              />
              <p *ngIf="errors.maxGuests" id="draft-capacity-error" class="field-error" role="alert">{{ errors.maxGuests }}</p>
            </div>
            <div class="field">
              <label for="draft-price">Precio por noche (COP)</label>
              <input
                id="draft-price"
                name="pricePerNight"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                placeholder="$ 0"
                [value]="priceDisplay"
                (input)="onPriceInput($event)"
                [class.input-error]="errors.pricePerNight"
                [attr.aria-invalid]="!!errors.pricePerNight"
                aria-describedby="draft-price-error"
              />
              <p *ngIf="errors.pricePerNight" id="draft-price-error" class="field-error" role="alert">{{ errors.pricePerNight }}</p>
            </div>
          </div>

          <fieldset class="field">
            <legend>Servicios</legend>
            <div class="chips">
              <label *ngFor="let item of amenityOptions" class="chip" [class.active]="form.amenities.includes(item.value)">
                <input
                  type="checkbox"
                  [checked]="form.amenities.includes(item.value)"
                  (change)="toggleAmenity(item.value)"
                />
                {{ item.label }}
              </label>
            </div>
          </fieldset>

          <div class="field">
            <label for="draft-rules">Reglas de la casa</label>
            <textarea
              id="draft-rules"
              name="rules"
              rows="3"
              [(ngModel)]="form.rulesText"
              placeholder="Una regla por línea. Ej. No fumar"
            ></textarea>
          </div>

          <div class="field">
            <label for="draft-cancellation-policy">Política de cancelación (HU-039)</label>
            <select
              id="draft-cancellation-policy"
              name="cancellationPolicy"
              [ngModel]="form.cancellationPolicy || 'FLEXIBLE'"
              (ngModelChange)="selectCancellationPolicy($event)"
            >
              <option *ngFor="let policy of cancellationPolicies" [value]="policy.code">
                {{ policy.name }} (100 % hasta 48 h antes · 50 % después)
              </option>
            </select>
            <p class="sub-label" *ngIf="selectedCancellationPolicy">{{ selectedCancellationPolicy.description }}</p>
          </div>

          <fieldset class="field">
            <legend>Imágenes</legend>
            <label
              class="dropzone"
              for="draft-image-files"
              [class.dragging]="dragging"
              [class.busy]="uploading"
              (dragover)="onDragOver($event)"
              (dragleave)="dragging = false"
              (drop)="onDrop($event)"
            >
              <input
                id="draft-image-files"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                [disabled]="uploading || uploadedImages.length >= maxImages"
                (change)="onFilesSelected($event)"
              />
              <span class="dropzone-title">{{ uploading ? 'Subiendo imágenes…' : 'Sube fotos desde tu dispositivo' }}</span>
              <span class="dropzone-hint">Haz clic o arrastra aquí · JPG, PNG o WEBP · máximo 5 MB cada una · hasta {{ maxImages }}</span>
            </label>
            <p *ngIf="imageError" class="field-error" role="alert">{{ imageError }}</p>

            <ul class="previews" *ngIf="uploadedImages.length > 0" aria-label="Imágenes subidas">
              <li *ngFor="let url of uploadedImages; let first = first">
                <img [src]="url" [alt]="'Imagen ' + (uploadedImages.indexOf(url) + 1) + ' de la publicación'" />
                <span *ngIf="first" class="cover-tag">Portada</span>
                <button type="button" class="remove-image" (click)="removeImage(url)" [attr.aria-label]="'Quitar imagen ' + (uploadedImages.indexOf(url) + 1)">Quitar</button>
              </li>
            </ul>

            <label for="draft-images" class="sub-label">O pega enlaces de imágenes (una URL por línea)</label>
            <textarea
              id="draft-images"
              name="images"
              rows="2"
              [(ngModel)]="form.imagesText"
              placeholder="https://…"
            ></textarea>
          </fieldset>

          <button type="submit" class="btn-primary" [disabled]="loading || uploading">
            {{ loading ? 'Guardando…' : 'Guardar borrador' }}
          </button>
        </form>

        <aside class="list-card" aria-label="Mis publicaciones">
          <h2>Mis publicaciones</h2>
          <p *ngIf="myListings.length === 0" class="muted">Aún no tienes publicaciones.</p>
          <ul>
            <li *ngFor="let item of myListings">
              <div class="item-head">
                <strong>{{ item.title }}</strong>
                <span class="badge">{{ item.status }}</span>
              </div>
              <span *ngIf="!item.isComplete" class="badge badge-warning">Incompleta</span>
              <span *ngIf="item.isComplete" class="badge badge-success">Completa</span>
            </li>
          </ul>
        </aside>
      </div>
    </section>
  `,
  styles: [`
    .draft-shell {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 16px 48px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .eyebrow {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--apple-text-secondary, #6e6e73);
    }
    h1 {
      font-size: 1.9rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--apple-text-primary, #1d1d1f);
      margin: 4px 0 6px;
    }
    .subtitle,
    .muted {
      color: var(--apple-text-secondary, #6e6e73);
      font-size: 0.92rem;
    }
    .back-link {
      display: inline-block;
      margin-top: 8px;
      font-weight: 600;
      font-size: 0.85rem;
    }
    .workspace {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }
    .form-card,
    .list-card {
      background: var(--apple-surface, #ffffff);
      border: 1px solid var(--apple-border-subtle, rgba(0, 0, 0, 0.08));
      border-radius: 20px;
      box-shadow: var(--apple-shadow, 0 12px 32px rgba(0, 0, 0, 0.06));
      padding: 24px;
    }
    .form-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .grid-2,
    .grid-3 {
      display: grid;
      gap: 12px;
    }
    .grid-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .grid-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      border: none;
      padding: 0;
      margin: 0;
      min-width: 0;
    }
    label,
    legend {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--apple-text-primary, #1d1d1f);
    }
    .required {
      color: var(--apple-red, #d70015);
    }
    input,
    select,
    textarea {
      width: 100%;
      padding: 11px 12px;
      font: inherit;
      font-size: 0.92rem;
      border: 1px solid var(--apple-border, #d2d2d7);
      border-radius: 12px;
      background: #ffffff;
      color: var(--apple-text-primary, #1d1d1f);
    }
    input:focus,
    select:focus,
    textarea:focus {
      border-color: var(--apple-ink, #1d1d1f);
      outline: none;
    }
    .input-error {
      border-color: var(--apple-red, #d70015);
      background: var(--apple-red-bg, #fff2f4);
    }
    .field-error {
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--apple-red, #d70015);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid var(--apple-border, #d2d2d7);
      border-radius: 999px;
      font-weight: 500;
      cursor: pointer;
    }
    .chip.active {
      border-color: var(--apple-ink, #1d1d1f);
      background: #f5f5f7;
    }
    .chip input {
      width: auto;
      padding: 0;
    }
    .dropzone {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 22px 16px;
      border: 1.5px dashed var(--apple-border, #d2d2d7);
      border-radius: 14px;
      background: #fafafa;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .dropzone:hover,
    .dropzone.dragging {
      border-color: var(--apple-ink, #1d1d1f);
      background: #f5f5f7;
    }
    .dropzone.busy {
      cursor: progress;
      opacity: 0.7;
    }
    .dropzone input[type='file'] {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
    .dropzone-title {
      font-weight: 600;
      font-size: 0.9rem;
    }
    .dropzone-hint {
      font-size: 0.78rem;
      color: var(--apple-text-secondary, #6e6e73);
    }
    .previews {
      list-style: none;
      margin: 4px 0 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 10px;
    }
    .previews li {
      position: relative;
      aspect-ratio: 4 / 3;
      border-radius: 12px;
      overflow: hidden;
      background: #e5e5ea;
    }
    .previews img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .cover-tag {
      position: absolute;
      top: 6px;
      left: 6px;
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      font-size: 0.68rem;
      font-weight: 700;
    }
    .remove-image {
      position: absolute;
      right: 6px;
      bottom: 6px;
      padding: 3px 9px;
      border: none;
      border-radius: 999px;
      background: rgba(29, 29, 31, 0.85);
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
    }
    .sub-label {
      margin-top: 6px;
      font-weight: 500;
      color: var(--apple-text-secondary, #6e6e73);
    }
    .btn-primary {
      padding: 14px 20px;
      border: none;
      border-radius: 14px;
      background: var(--apple-ink, #1d1d1f);
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .alert {
      padding: 12px 14px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.88rem;
    }
    .alert-success {
      background: var(--apple-green-bg, #f2fbf5);
      border: 1px solid rgba(36, 138, 61, 0.25);
      color: var(--apple-green, #248a3d);
    }
    .alert-warning {
      background: #fff8e6;
      border: 1px solid rgba(178, 107, 0, 0.3);
      color: #8a5300;
    }
    .alert-error {
      background: var(--apple-red-bg, #fff2f4);
      border: 1px solid rgba(215, 0, 21, 0.25);
      color: var(--apple-red, #d70015);
    }
    .link-btn {
      align-self: flex-start;
      border: none;
      background: none;
      padding: 0;
      font-weight: 600;
      color: inherit;
      text-decoration: underline;
      cursor: pointer;
    }
    .list-card h2 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .list-card ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .list-card li {
      border: 1px solid var(--apple-border-subtle, rgba(0, 0, 0, 0.08));
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.85rem;
    }
    .item-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      overflow-wrap: anywhere;
    }
    .badge {
      align-self: flex-start;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      background: #f5f5f7;
      color: var(--apple-text-secondary, #6e6e73);
      white-space: nowrap;
    }
    .badge-warning {
      background: #fff8e6;
      color: #8a5300;
    }
    .badge-success {
      background: var(--apple-green-bg, #f2fbf5);
      color: var(--apple-green, #248a3d);
    }
    @media (max-width: 860px) {
      .workspace {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 560px) {
      .grid-2,
      .grid-3 {
        grid-template-columns: 1fr;
      }
      .form-card,
      .list-card {
        padding: 18px;
      }
    }
  `],
})
export class ListingDraftFormComponent implements OnInit {
  static readonly FIELD_LABELS: Record<string, string> = {
    description: 'descripción',
    city: 'ciudad',
    department: 'departamento',
    address: 'dirección o referencia',
    propertyType: 'tipo',
    maxGuests: 'capacidad',
    pricePerNight: 'precio por noche',
    amenities: 'servicios',
    rules: 'reglas',
    images: 'imágenes',
  };

  readonly departments = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá', 'Caldas',
    'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía',
    'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander',
    'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre',
    'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada',
  ];

  readonly propertyTypes: Array<{ value: PropertyType; label: string }> = [
    { value: 'CASA', label: 'Casa' },
    { value: 'APARTAMENTO', label: 'Apartamento' },
    { value: 'CABANA', label: 'Cabaña' },
    { value: 'FINCA', label: 'Finca' },
    { value: 'HABITACION', label: 'Habitación' },
    { value: 'OTRO', label: 'Otro' },
  ];

  readonly amenityOptions = [
    { value: 'WIFI', label: 'Wi-Fi' },
    { value: 'COCINA', label: 'Cocina' },
    { value: 'PARQUEADERO', label: 'Parqueadero' },
    { value: 'PISCINA', label: 'Piscina' },
    { value: 'AIRE_ACONDICIONADO', label: 'Aire acondicionado' },
    { value: 'TV', label: 'TV' },
    { value: 'LAVADORA', label: 'Lavadora' },
    { value: 'MASCOTAS', label: 'Admite mascotas' },
  ];

  readonly maxImages = MAX_IMAGES;

  cancellationPolicies: CancellationPolicyOption[] = CANCELLATION_POLICIES_CATALOG;
  selectedCancellationPolicy: CancellationPolicyOption = CANCELLATION_POLICIES_CATALOG[0];

  form: ListingDraftForm = emptyForm();
  uploadedImages: string[] = [];
  uploading = false;
  dragging = false;
  imageError = '';
  errors: Partial<Record<DraftField, string>> = {};
  saved: SavedDraft | null = null;
  myListings: SavedDraft[] = [];
  loading = false;

  ngOnInit(): void {
    void this.loadMyListings().catch(() => undefined);
    void this.loadCancellationPolicies().catch(() => undefined);
  }

  /** HU-039 CA1: consulta el catálogo de políticas de cancelación y permite asociar la Flexible a la publicación. */
  async loadCancellationPolicies(): Promise<void> {
    const response = await fetch('/api/listings/cancellation-policies');
    if (response.ok) {
      const policies = (await response.json()) as CancellationPolicyOption[];
      if (Array.isArray(policies) && policies.length > 0) {
        this.cancellationPolicies = policies;
        this.selectedCancellationPolicy =
          policies.find((item) => item.code === (this.form.cancellationPolicy || 'FLEXIBLE')) ?? policies[0];
      }
    }
  }

  selectCancellationPolicy(code: CancellationPolicyCode): void {
    this.form.cancellationPolicy = code;
    this.selectedCancellationPolicy =
      this.cancellationPolicies.find((item) => item.code === code) ?? CANCELLATION_POLICIES_CATALOG[0];
  }

  private authHeaders(): Record<string, string> {
    const token = getActiveSession()?.token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  get priceDisplay(): string {
    return formatCop(this.form.pricePerNight);
  }

  /** Muestra el precio con signo pesos y puntos mientras se escribe, y guarda solo el número. */
  onPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.pricePerNight = parseCop(input.value);
    input.value = this.priceDisplay;
    input.setSelectionRange(input.value.length, input.value.length);
    if (this.errors.pricePerNight) {
      this.errors = { ...this.errors, pricePerNight: undefined };
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    void this.uploadImages(files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    void this.uploadImages(Array.from(event.dataTransfer?.files ?? []));
  }

  /** Revisa tipo, tamaño y cantidad antes de subir, para avisar sin esperar al servidor. */
  validateImageFiles(files: File[]): string {
    if (files.length === 0) {
      return '';
    }
    if (this.uploadedImages.length + files.length > MAX_IMAGES) {
      return `Puedes subir hasta ${MAX_IMAGES} imágenes por publicación.`;
    }
    const wrongType = files.find((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type));
    if (wrongType) {
      return `«${wrongType.name}» no es una imagen JPG, PNG o WEBP.`;
    }
    const tooBig = files.find((file) => file.size > MAX_IMAGE_BYTES);
    if (tooBig) {
      return `«${tooBig.name}» supera el tamaño máximo de 5 MB.`;
    }
    return '';
  }

  /** HU-010: sube las imágenes al API y muestra su vista previa. */
  async uploadImages(files: File[]): Promise<void> {
    this.imageError = this.validateImageFiles(files);
    if (this.imageError || files.length === 0) {
      return;
    }

    const body = new FormData();
    for (const file of files) {
      body.append('images', file, file.name);
    }

    this.uploading = true;
    try {
      const token = getActiveSession()?.token;
      const response = await fetch('/api/listings/images', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.imageError = this.uploadError(response.status, result);
        return;
      }
      this.uploadedImages = [...this.uploadedImages, ...((result as { urls?: string[] }).urls ?? [])];
    } catch {
      this.imageError = 'No fue posible subir las imágenes. Revisa tu conexión e intenta de nuevo.';
    } finally {
      this.uploading = false;
    }
  }

  private uploadError(status: number, body: { message?: string | string[] }): string {
    if (status === 401) {
      return 'Tu sesión expiró. Inicia sesión de nuevo.';
    }
    if (status === 403) {
      return 'Solo los anfitriones pueden subir imágenes.';
    }
    if (status === 413) {
      return 'Una de las imágenes supera el tamaño máximo de 5 MB.';
    }
    return [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible subir las imágenes.';
  }

  removeImage(url: string): void {
    this.uploadedImages = this.uploadedImages.filter((item) => item !== url);
  }

  missingLabels(fields: string[]): string {
    return fields.map((field) => ListingDraftFormComponent.FIELD_LABELS[field] ?? field).join(', ');
  }

  toggleAmenity(value: string): void {
    this.form.amenities = this.form.amenities.includes(value)
      ? this.form.amenities.filter((item) => item !== value)
      : [...this.form.amenities, value];
  }

  /** CA2 y CA4: solo el título es obligatorio; capacidad y precio deben ser mayores que 0 si se ingresan. */
  validate(): boolean {
    const errors: Partial<Record<DraftField, string>> = {};
    const title = this.form.title.trim();
    if (!title) {
      errors.title = 'El título es obligatorio.';
    } else if (title.length < 5) {
      errors.title = 'El título debe tener al menos 5 caracteres.';
    }

    const capacity = this.form.maxGuests;
    if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
      errors.maxGuests = 'La capacidad debe ser mayor que 0.';
    }

    const price = this.form.pricePerNight;
    if (price !== null && (!Number.isFinite(price) || price <= 0)) {
      errors.pricePerNight = 'El precio por noche debe ser mayor que 0.';
    }

    this.errors = errors;
    return Object.keys(errors).length === 0;
  }

  buildPayload(): Record<string, unknown> {
    const text = (value: string) => value.trim() || undefined;
    const lines = (value: string) =>
      value
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const payload: Record<string, unknown> = {
      title: this.form.title.trim(),
      description: text(this.form.description),
      city: text(this.form.city),
      department: text(this.form.department),
      address: text(this.form.address),
      propertyType: this.form.propertyType || undefined,
      maxGuests: this.form.maxGuests ?? undefined,
      pricePerNight: this.form.pricePerNight ?? undefined,
      amenities: this.form.amenities,
      rules: lines(this.form.rulesText),
      images: [...this.uploadedImages, ...lines(this.form.imagesText)],
      cancellationPolicy: this.form.cancellationPolicy || undefined,
    };
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  }

  async save(): Promise<void> {
    this.saved = null;
    if (!this.validate()) {
      return;
    }

    this.loading = true;
    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(this.buildPayload()),
      });
      const body = await response.json().catch(() => ({}));

      if (response.status === 403) {
        this.errors = { form: 'Solo los anfitriones pueden crear publicaciones.' };
        return;
      }
      if (response.status === 401) {
        this.errors = { form: 'Tu sesión expiró. Inicia sesión de nuevo.' };
        return;
      }
      if (!response.ok) {
        this.applyServerErrors(body);
        return;
      }

      this.saved = body as SavedDraft;
      this.myListings = [this.saved, ...this.myListings.filter((item) => item.id !== this.saved?.id)];
    } catch {
      this.errors = { form: 'No fue posible conectar con el servidor. Intenta de nuevo.' };
    } finally {
      this.loading = false;
    }
  }

  private applyServerErrors(body: { message?: string | string[]; fieldErrors?: Record<string, string[]> }): void {
    const errors: Partial<Record<DraftField, string>> = {};
    const fieldErrors = body?.fieldErrors ?? {};
    for (const field of ['title', 'maxGuests', 'pricePerNight'] as const) {
      if (fieldErrors[field]?.length) {
        errors[field] = fieldErrors[field][0];
      }
    }
    if (Object.keys(errors).length === 0) {
      errors.form = [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible guardar la publicación.';
    }
    this.errors = errors;
  }

  async loadMyListings(): Promise<void> {
    const response = await fetch('/api/listings/mine', { headers: this.authHeaders() });
    this.myListings = response.ok ? await response.json() : [];
  }

  startNew(): void {
    this.form = emptyForm();
    this.uploadedImages = [];
    this.imageError = '';
    this.errors = {};
    this.saved = null;
  }
}
