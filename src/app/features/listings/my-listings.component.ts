import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import { ListingStatus, MyListing } from '../../shared/models/listing.model';

type StatusFilter = ListingStatus | 'TODAS';

const STATUS_ORDER: ListingStatus[] = ['BORRADOR', 'PENDIENTE_REVISION', 'ACTIVA', 'PAUSADA', 'BLOQUEADA'];

const STATUS_LABELS: Record<ListingStatus, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_REVISION: 'En revisión',
  ACTIVA: 'Activa',
  PAUSADA: 'Pausada',
  BLOQUEADA: 'Bloqueada',
};

interface ActivationFailure {
  message: string;
  missing: string[];
}

/**
 * HU-012 · Consultar mis publicaciones (CA1, CA2, RF-016, RN-005).
 * El anfitrión ve sus publicaciones con título, ciudad, precio y estado,
 * y el motivo del administrador cuando fueron devueltas o bloqueadas.
 * HU-013 · Desde un borrador puede solicitar la activación (RF-017).
 */
@Component({
  selector: 'app-my-listings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="my-listings-shell">
      <header class="page-header">
        <div>
          <span class="eyebrow">Panel de Anfitrión</span>
          <h1>Mis publicaciones</h1>
          <p class="subtitle">Revisa el estado de tus alojamientos y gestiona tu oferta.</p>
        </div>
        <a routerLink="/anfitrion/publicaciones/nueva" class="new-listing-btn">+ Nueva publicación</a>
      </header>

      <p class="loading" *ngIf="loading" role="status">Cargando tus publicaciones…</p>

      <div class="alert-success" *ngIf="successMessage" role="status">{{ successMessage }}</div>

      <div class="alert-error" *ngIf="errorMessage" role="alert">
        {{ errorMessage }}
        <button type="button" class="retry-btn" (click)="load()">Reintentar</button>
      </div>

      <ng-container *ngIf="!loading && !errorMessage">
        <div class="empty-state" *ngIf="listings.length === 0">
          <h2>Aún no tienes publicaciones</h2>
          <p>Crea tu primera publicación en borrador y complétala cuando quieras.</p>
          <a routerLink="/anfitrion/publicaciones/nueva" class="new-listing-btn">Crear publicación</a>
        </div>

        <ng-container *ngIf="listings.length > 0">
          <div class="filters" role="group" aria-label="Filtrar por estado">
            <button
              type="button"
              *ngFor="let option of filterOptions"
              [class.active]="filter === option.value"
              [attr.aria-pressed]="filter === option.value"
              (click)="filter = option.value"
            >
              {{ option.label }} <span class="count">{{ option.count }}</span>
            </button>
          </div>

          <ul class="listing-list">
            <li class="listing-card" *ngFor="let item of visibleListings">
              <div class="card-main">
                <div class="card-title-row">
                  <h3>{{ item.title }}</h3>
                  <span class="status-badge" [attr.data-status]="item.status">{{ item.statusLabel }}</span>
                </div>
                <p class="meta">
                  <span [class.pending]="!item.city">{{ item.city || 'Ciudad pendiente' }}</span>
                  <span class="dot" aria-hidden="true">·</span>
                  <span [class.pending]="item.pricePerNight == null">{{ priceLabel(item) }}</span>
                </p>
                <p class="incomplete" *ngIf="!item.isComplete && item.status === 'BORRADOR'">
                  Información pendiente: {{ item.missingFields.length }} campo(s) por completar.
                </p>
              </div>

              <div
                class="admin-reason"
                *ngIf="item.adminReason"
                [class.blocked]="item.adminReasonType === 'BLOQUEADA'"
                role="note"
              >
                <strong>{{ reasonTitle(item) }}</strong>
                <p>{{ item.adminReason }}</p>
              </div>

              <!-- HU-013 CA1: solicitar la activación desde BORRADOR -->
              <div class="card-actions" *ngIf="item.status === 'BORRADOR'">
                <button
                  type="button"
                  class="activate-btn"
                  [disabled]="activatingId === item.id"
                  (click)="requestActivation(item)"
                >
                  {{ activatingId === item.id ? 'Enviando a revisión…' : 'Solicitar activación' }}
                </button>
                <span class="hint">El administrador la revisará antes de que aparezca en las búsquedas.</span>
              </div>

              <!-- HU-051 CA4: tras corregir la publicación bloqueada, el anfitrión pide una nueva revisión -->
              <div class="card-actions" *ngIf="item.status === 'BLOQUEADA'">
                <button
                  type="button"
                  class="activate-btn"
                  [disabled]="activatingId === item.id"
                  (click)="requestActivation(item)"
                >
                  {{ activatingId === item.id ? 'Enviando a revisión…' : 'Solicitar nueva revisión' }}
                </button>
                <span class="hint">Corrige lo indicado en el motivo; el administrador la revisará de nuevo.</span>
              </div>

              <!-- HU-013 CA2: campos faltantes devueltos por el sistema -->
              <div class="activation-error" *ngIf="activationErrors[item.id] as failure" role="alert">
                <strong>{{ failure.message }}</strong>
                <ul *ngIf="failure.missing.length > 0">
                  <li *ngFor="let field of failure.missing">{{ field }}</li>
                </ul>
              </div>

              <!-- HU-019: periodos en que el alojamiento recibe reservas -->
              <a
                *ngIf="item.status !== 'BLOQUEADA'"
                class="availability-link"
                routerLink="/anfitrion/publicaciones"
                [queryParams]="{ listing: item.id }"
              >
                Gestionar periodos disponibles →
              </a>

              <!-- HU-015 y HU-016: limpieza, descuento por estancia larga y servicios adicionales -->
              <a
                *ngIf="item.status !== 'BLOQUEADA'"
                class="availability-link"
                [routerLink]="['/anfitrion/publicaciones', item.id, 'tarifas']"
              >
                Tarifas y servicios adicionales →
              </a>
            </li>
          </ul>

          <p class="empty-filter" *ngIf="visibleListings.length === 0">No tienes publicaciones en este estado.</p>
        </ng-container>
      </ng-container>
    </section>
  `,
  styles: [`
    .my-listings-shell {
      max-width: 1120px;
      margin: 0 auto;
      padding: 36px 24px 72px;
      color: #1d1d1f;
    }
    .page-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e5ea;
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
    .new-listing-btn {
      display: inline-block;
      padding: 10px 16px;
      border-radius: 12px;
      background: #1d1d1f;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
      white-space: nowrap;
    }
    .loading {
      color: #6e6e73;
    }
    .alert-error {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 13px 16px;
      border-radius: 12px;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .retry-btn {
      padding: 6px 14px;
      border-radius: 980px;
      border: 1px solid #fecaca;
      background: #ffffff;
      color: #991b1b;
      font-weight: 600;
      cursor: pointer;
    }
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      background: #ffffff;
      border: 1px dashed #d2d2d7;
      border-radius: 20px;
    }
    .empty-state h2 {
      margin: 0 0 8px;
      font-size: 1.2rem;
    }
    .empty-state p {
      margin: 0 0 18px;
      color: #6e6e73;
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 18px;
    }
    .filters button {
      padding: 7px 14px;
      border-radius: 980px;
      border: 1px solid #d2d2d7;
      background: #ffffff;
      color: #1d1d1f;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .filters button.active {
      background: #1d1d1f;
      border-color: #1d1d1f;
      color: #ffffff;
    }
    .count {
      margin-left: 4px;
      opacity: 0.7;
    }
    .listing-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .listing-card {
      background: #ffffff;
      border: 1px solid #e5e5ea;
      border-radius: 18px;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .card-title-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }
    h3 {
      margin: 0;
      font-size: 1.05rem;
      overflow-wrap: anywhere;
    }
    .meta {
      margin: 6px 0 0;
      color: #3a3a3c;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .meta .pending {
      color: #86868b;
      font-style: italic;
    }
    .dot {
      margin: 0 6px;
      color: #86868b;
    }
    .incomplete {
      margin: 6px 0 0;
      font-size: 0.8rem;
      color: #9a5b00;
    }
    .status-badge {
      padding: 4px 10px;
      border-radius: 980px;
      font-size: 0.74rem;
      font-weight: 700;
      background: #f5f5f7;
      color: #3a3a3c;
      white-space: nowrap;
    }
    .status-badge[data-status='PENDIENTE_REVISION'] { background: #fff4e5; color: #9a5b00; }
    .status-badge[data-status='ACTIVA'] { background: #e8f8ee; color: #166534; }
    .status-badge[data-status='PAUSADA'] { background: #eef2ff; color: #3730a3; }
    .status-badge[data-status='BLOQUEADA'] { background: #fef2f2; color: #991b1b; }
    .admin-reason {
      padding: 12px 14px;
      border-radius: 12px;
      background: #fff8eb;
      border-left: 4px solid #d97706;
      font-size: 0.86rem;
    }
    .admin-reason.blocked {
      background: #fef2f2;
      border-left-color: #b91c1c;
    }
    .admin-reason p {
      margin: 4px 0 0;
      color: #3a3a3c;
      overflow-wrap: anywhere;
    }
    .alert-success {
      padding: 13px 16px;
      margin-bottom: 18px;
      border-radius: 12px;
      background: #e8f8ee;
      color: #166534;
      border: 1px solid #bbf7d0;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .card-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px 14px;
    }
    .activate-btn {
      padding: 9px 16px;
      border-radius: 980px;
      border: none;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
    }
    .activate-btn:disabled {
      opacity: 0.6;
      cursor: progress;
    }
    .availability-link {
      align-self: flex-start;
      font-size: 0.84rem;
      font-weight: 600;
      color: #0066cc;
      text-decoration: none;
    }
    .hint {
      font-size: 0.78rem;
      color: #86868b;
    }
    .activation-error {
      padding: 12px 14px;
      border-radius: 12px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      font-size: 0.86rem;
    }
    .activation-error ul {
      margin: 6px 0 0;
      padding-left: 20px;
      color: #3a3a3c;
    }
    .activation-error li::first-letter {
      text-transform: uppercase;
    }
    .empty-filter {
      color: #86868b;
      font-size: 0.88rem;
    }
  `],
})
export class MyListingsComponent implements OnInit {
  listings: MyListing[] = [];
  filter: StatusFilter = 'TODAS';
  loading = false;
  errorMessage = '';
  successMessage = '';
  activatingId: string | null = null;
  activationErrors: Record<string, ActivationFailure> = {};

  private readonly priceFormatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

  ngOnInit(): void {
    void this.load();
  }

  /** Estados presentes en mis publicaciones, con su cantidad, para filtrar el listado. */
  get filterOptions(): Array<{ value: StatusFilter; label: string; count: number }> {
    const present = STATUS_ORDER.filter((status) => this.listings.some((item) => item.status === status));
    return [
      { value: 'TODAS', label: 'Todas', count: this.listings.length },
      ...present.map((status) => ({
        value: status,
        label: STATUS_LABELS[status],
        count: this.listings.filter((item) => item.status === status).length,
      })),
    ];
  }

  get visibleListings(): MyListing[] {
    return this.filter === 'TODAS' ? this.listings : this.listings.filter((item) => item.status === this.filter);
  }

  priceLabel(item: MyListing): string {
    return item.pricePerNight == null ? 'Precio pendiente' : `${this.priceFormatter.format(item.pricePerNight)} / noche`;
  }

  reasonTitle(item: MyListing): string {
    return item.adminReasonType === 'BLOQUEADA'
      ? 'Bloqueada por el administrador. Motivo:'
      : 'Devuelta por el administrador. Motivo:';
  }

  private authHeaders(): Record<string, string> {
    const token = getActiveSession()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** HU-013: envía el borrador a revisión; si faltan campos muestra cuáles (CA2). */
  async requestActivation(item: MyListing): Promise<void> {
    this.activatingId = item.id;
    this.successMessage = '';
    this.activationErrors = Object.fromEntries(
      Object.entries(this.activationErrors).filter(([id]) => id !== item.id),
    );

    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(item.id)}/request-activation`, {
        method: 'PATCH',
        headers: this.authHeaders(),
      });
      const body = await response.json().catch(() => ({}));

      if (response.ok) {
        const updated = body as MyListing;
        this.listings = this.listings.map((listing) => (listing.id === item.id ? updated : listing));
        this.successMessage =
          item.status === 'BLOQUEADA'
            ? `«${item.title}» se envió a una nueva revisión. Volverá a las búsquedas cuando el administrador la apruebe.`
            : `«${item.title}» se envió a revisión. Aparecerá en las búsquedas cuando el administrador la apruebe.`;
        return;
      }

      this.activationErrors = { ...this.activationErrors, [item.id]: this.activationFailure(response.status, body) };
    } catch {
      this.activationErrors = {
        ...this.activationErrors,
        [item.id]: { message: 'No fue posible conectar con el servidor. Intenta de nuevo.', missing: [] },
      };
    } finally {
      this.activatingId = null;
    }
  }

  private activationFailure(
    status: number,
    body: { message?: string | string[]; missingFieldLabels?: string[] },
  ): ActivationFailure {
    if (body?.missingFieldLabels?.length) {
      return { message: 'No se puede solicitar la activación. Completa estos campos:', missing: body.missingFieldLabels };
    }
    if (status === 401) {
      return { message: 'Tu sesión expiró. Inicia sesión de nuevo.', missing: [] };
    }
    if (status === 404) {
      return { message: 'La publicación no existe o no te pertenece.', missing: [] };
    }
    const message = [body?.message].flat().filter(Boolean).join(' ');
    return { message: message || 'No fue posible solicitar la activación.', missing: [] };
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await fetch('/api/listings/mine', { headers: this.authHeaders() });

      if (response.status === 401) {
        this.errorMessage = 'Tu sesión expiró. Inicia sesión de nuevo para ver tus publicaciones.';
        return;
      }
      if (response.status === 403) {
        this.errorMessage = 'Solo los anfitriones pueden consultar sus publicaciones.';
        return;
      }
      if (!response.ok) {
        this.errorMessage = 'No fue posible cargar tus publicaciones. Intenta de nuevo.';
        return;
      }

      this.listings = (await response.json()) as MyListing[];
      if (this.filter !== 'TODAS' && !this.listings.some((item) => item.status === this.filter)) {
        this.filter = 'TODAS';
      }
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }
}
