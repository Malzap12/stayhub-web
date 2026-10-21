import { Component, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import { AvailabilityPeriod, MyListing } from '../../shared/models/listing.model';

/** Respuesta de error del API al registrar un periodo (HU-019 CA2, CA3). */
interface PeriodErrorBody {
  message?: string | string[];
  conflictingPeriod?: Pick<AvailabilityPeriod, 'id' | 'startDate' | 'endDate'>;
}

/** Fecha YYYY-MM-DD en la hora local del navegador (toISOString usaría UTC y en la noche ya sería mañana). */
function localDateString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

@Component({
  selector: 'app-host-availability',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="host-shell">
      <header class="host-header">
        <div>
          <span class="eyebrow">Panel de Anfitrión</span>
          <h1>Registrar periodos disponibles</h1>
          <p class="subtitle">
            Configura las ventanas de fechas en que tu alojamiento está habilitado para recibir reservas.
          </p>
        </div>
        <a routerLink="/anfitrion/publicaciones/nueva" class="new-listing-btn">+ Nueva publicación</a>
      </header>

      <div class="alert-success" *ngIf="successMessage" role="status">
        {{ successMessage }}
      </div>

      <div class="alert-error" *ngIf="errorMessage" role="alert">
        {{ errorMessage }}
      </div>

      <p class="empty-msg" *ngIf="loadingListings">Cargando tus alojamientos…</p>

      <section class="form-card" *ngIf="!loadingListings && hostListings.length === 0 && !errorMessage">
        <h2>Aún no tienes alojamientos</h2>
        <p class="empty-msg">Crea una publicación para poder registrar sus periodos disponibles.</p>
      </section>

      <div class="workspace-grid" *ngIf="hostListings.length > 0">
        <!-- Formulario de registro de periodo -->
        <section class="form-card" aria-label="Formulario de nuevo periodo disponible">
          <h2>Nuevo periodo de disponibilidad</h2>

          <div class="field">
            <label for="listing-select">Alojamiento</label>
            <select id="listing-select" [(ngModel)]="selectedListingId" (ngModelChange)="selectListing($event)">
              <option *ngFor="let item of hostListings" [value]="item.id">
                {{ item.title }}{{ item.city ? ' (' + item.city + ')' : '' }}
              </option>
            </select>
          </div>

          <div class="date-row">
            <div class="field">
              <label for="start-date">Fecha de inicio</label>
              <input id="start-date" type="date" [min]="today" [(ngModel)]="startDateInput" />
            </div>

            <div class="field">
              <label for="end-date">Fecha de fin</label>
              <input id="end-date" type="date" [min]="startDateInput || today" [(ngModel)]="endDateInput" />
            </div>
          </div>

          <button type="button" class="btn-primary" [disabled]="saving" (click)="registerPeriod()">
            {{ saving ? 'Guardando…' : 'Guardar periodo disponible' }}
          </button>
        </section>

        <!-- Listado de periodos registrados para el alojamiento seleccionado -->
        <section class="periods-card" aria-label="Periodos disponibles registrados">
          <h2>Periodos habilitados para reservas ({{ periods.length }})</h2>
          <p class="empty-msg" *ngIf="loadingPeriods">Cargando periodos…</p>
          <p class="empty-msg" *ngIf="!loadingPeriods && periods.length === 0">
            Aún no hay periodos registrados para este alojamiento.
          </p>

          <ul class="period-list" *ngIf="periods.length > 0">
            <li
              class="period-item"
              *ngFor="let period of periods"
              [class.conflict]="period.id === conflictingPeriodId"
            >
              <div>
                <strong>{{ period.startDate }} → {{ period.endDate }}</strong>
                <span class="period-meta">{{ nightsLabel(period) }}</span>
              </div>
              <span class="badge-available" *ngIf="period.availableForBooking">
                Disponible para reservas
              </span>
            </li>
          </ul>
        </section>
      </div>
    </section>
  `,
  styles: [`
    .host-shell {
      max-width: 1120px;
      margin: 0 auto;
      padding: 36px 24px 72px;
      color: #1d1d1f;
    }
    .host-header {
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e5ea;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12px;
    }
    .new-listing-btn {
      padding: 10px 16px;
      border-radius: 12px;
      background: #1d1d1f;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      white-space: nowrap;
    }
    .eyebrow {
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #86868b;
    }
    h1 {
      margin: 6px 0 8px;
      font-size: 1.95rem;
      letter-spacing: -0.03em;
    }
    .subtitle {
      margin: 0;
      color: #6e6e73;
      font-size: 0.92rem;
    }
    .alert-success,
    .alert-error {
      padding: 13px 16px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 0.86rem;
      font-weight: 600;
    }
    .alert-success {
      background: #e8f8ee;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .alert-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .workspace-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 24px;
    }
    .form-card,
    .periods-card {
      background: #ffffff;
      border: 1px solid #e5e5ea;
      border-radius: 20px;
      padding: 24px;
    }
    h2 {
      margin: 0 0 16px;
      font-size: 1.15rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }
    .field label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #3a3a3c;
    }
    .field select,
    .field input {
      height: 40px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid #d2d2d7;
      font-size: 0.88rem;
      font-family: inherit;
    }
    .date-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .btn-primary {
      width: 100%;
      margin-top: 6px;
      padding: 11px 18px;
      border-radius: 980px;
      border: none;
      background: #1d1d1f;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.84rem;
      cursor: pointer;
    }
    .period-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .period-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: #f5f5f7;
      border-radius: 12px;
      font-size: 0.86rem;
    }
    .period-meta {
      display: block;
      font-size: 0.72rem;
      color: #86868b;
      margin-top: 2px;
    }
    .period-item.conflict {
      background: #fef2f2;
      outline: 2px solid #fca5a5;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: progress;
    }
    .badge-available {
      padding: 4px 10px;
      border-radius: 980px;
      font-size: 0.74rem;
      font-weight: 700;
      background: #e8f8ee;
      color: #166534;
    }
    .empty-msg {
      color: #86868b;
      font-size: 0.86rem;
      margin: 0;
    }
  `],
})
export class HostAvailabilityComponent implements OnInit {
  hostListings: MyListing[] = [];
  periods: AvailabilityPeriod[] = [];

  selectedListingId = '';
  startDateInput = '';
  endDateInput = '';
  errorMessage = '';
  successMessage = '';
  /** HU-019 CA3: periodo existente con el que chocó el último intento, resaltado en la lista. */
  conflictingPeriodId = '';

  loadingListings = false;
  loadingPeriods = false;
  saving = false;

  readonly today = localDateString(new Date());

  constructor(@Optional() private readonly route?: ActivatedRoute) {}

  ngOnInit(): void {
    void this.loadListings();
  }

  clearFeedback(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.conflictingPeriodId = '';
  }

  async selectListing(listingId: string): Promise<void> {
    this.selectedListingId = listingId;
    this.clearFeedback();
    await this.loadPeriods();
  }

  nightsLabel(period: AvailabilityPeriod): string {
    const nights = Math.round((Date.parse(period.endDate) - Date.parse(period.startDate)) / 86_400_000);
    return nights === 1 ? '1 noche' : `${nights} noches`;
  }

  /** Carga los alojamientos del anfitrión (HU-012) y preselecciona el indicado en ?listing=. */
  async loadListings(): Promise<void> {
    this.loadingListings = true;
    this.errorMessage = '';
    try {
      const response = await fetch('/api/listings/mine', { headers: this.authHeaders() });
      if (!response.ok) {
        this.errorMessage = this.describeHttpError(response.status, 'No pudimos cargar tus alojamientos.');
        return;
      }
      this.hostListings = (await response.json()) as MyListing[];
      const requested = this.route?.snapshot.queryParamMap.get('listing');
      const initial = this.hostListings.find((item) => item.id === requested) ?? this.hostListings[0];
      if (initial) {
        this.selectedListingId = initial.id;
        await this.loadPeriods();
      }
    } catch {
      this.errorMessage = 'No pudimos conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loadingListings = false;
    }
  }

  async loadPeriods(): Promise<void> {
    if (!this.selectedListingId) {
      this.periods = [];
      return;
    }
    this.loadingPeriods = true;
    try {
      const response = await fetch(this.periodsUrl(), { headers: this.authHeaders() });
      if (!response.ok) {
        this.periods = [];
        this.errorMessage = this.describeHttpError(response.status, 'No pudimos cargar los periodos del alojamiento.');
        return;
      }
      this.periods = (await response.json()) as AvailabilityPeriod[];
    } catch {
      this.errorMessage = 'No pudimos conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loadingPeriods = false;
    }
  }

  /** HU-019: valida en el navegador (CA2, CA3) y registra el periodo en el servidor (CA1). */
  async registerPeriod(): Promise<AvailabilityPeriod | null> {
    this.clearFeedback();
    const startDate = this.startDateInput?.trim();
    const endDate = this.endDateInput?.trim();

    if (!startDate || !endDate) {
      this.errorMessage = 'Debes seleccionar la fecha de inicio y la fecha de fin.';
      return null;
    }

    // CA2: Dado que el periodo termina antes de empezar o comienza en el pasado, el sistema lo rechaza.
    if (endDate <= startDate) {
      this.errorMessage = 'El periodo fue rechazado: la fecha de fin debe ser posterior a la fecha de inicio.';
      return null;
    }

    if (startDate < localDateString(new Date())) {
      this.errorMessage = 'El periodo fue rechazado: la fecha de inicio no puede comenzar en el pasado.';
      return null;
    }

    // CA3: Dado que el periodo se superpone con otro ya registrado, el sistema lo rechaza e indica el periodo existente.
    const overlapping = this.periods.find(
      (existing) => startDate <= existing.endDate && endDate >= existing.startDate,
    );
    if (overlapping) {
      this.showOverlap(overlapping);
      return null;
    }

    this.saving = true;
    try {
      const response = await fetch(this.periodsUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ startDate, endDate }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.showServerError(response.status, body);
        return null;
      }

      // CA1: El periodo queda disponible para reservas.
      const created = body as AvailabilityPeriod;
      this.periods = [...this.periods, created].sort((a, b) => a.startDate.localeCompare(b.startDate));
      this.successMessage = `Periodo del ${created.startDate} al ${created.endDate} registrado y disponible para reservas.`;
      this.startDateInput = '';
      this.endDateInput = '';
      return created;
    } catch {
      this.errorMessage = 'No pudimos conectar con el servidor. Intenta de nuevo.';
      return null;
    } finally {
      this.saving = false;
    }
  }

  private showOverlap(existing: Pick<AvailabilityPeriod, 'id' | 'startDate' | 'endDate'>): void {
    this.conflictingPeriodId = existing.id;
    this.errorMessage = `El periodo se superpone con el periodo existente del ${existing.startDate} al ${existing.endDate}.`;
  }

  private showServerError(status: number, body: PeriodErrorBody): void {
    if (body.conflictingPeriod) {
      this.showOverlap(body.conflictingPeriod);
      return;
    }
    const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    this.errorMessage =
      status === 400 && message
        ? `El periodo fue rechazado: ${message}`
        : this.describeHttpError(status, 'No pudimos registrar el periodo.');
  }

  private describeHttpError(status: number, fallback: string): string {
    if (status === 401) {
      return 'Tu sesión expiró. Inicia sesión de nuevo.';
    }
    if (status === 403) {
      return 'Solo los anfitriones pueden gestionar periodos disponibles.';
    }
    if (status === 404) {
      return 'El alojamiento no existe o no te pertenece.';
    }
    return fallback;
  }

  private periodsUrl(): string {
    return `/api/listings/${encodeURIComponent(this.selectedListingId)}/availability-periods`;
  }

  private authHeaders(): Record<string, string> {
    const token = getActiveSession()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
