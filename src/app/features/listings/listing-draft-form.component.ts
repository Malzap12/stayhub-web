import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';

export type PropertyType = 'CASA' | 'APARTAMENTO' | 'CABANA' | 'FINCA' | 'HABITACION' | 'OTRO';

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
                type="number"
                min="1"
                [(ngModel)]="form.pricePerNight"
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
            <label for="draft-images">Imágenes</label>
            <textarea
              id="draft-images"
              name="images"
              rows="3"
              [(ngModel)]="form.imagesText"
              placeholder="Una URL por línea"
            ></textarea>
          </div>

          <button type="submit" class="btn-primary" [disabled]="loading">
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

  form: ListingDraftForm = emptyForm();
  errors: Partial<Record<DraftField, string>> = {};
  saved: SavedDraft | null = null;
  myListings: SavedDraft[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadMyListings().catch(() => undefined);
  }

  private authHeaders(): Record<string, string> {
    const token = getActiveSession()?.token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
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
      images: lines(this.form.imagesText),
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
    this.errors = {};
    this.saved = null;
  }
}
