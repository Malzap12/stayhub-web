import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getActiveSession } from '../../core/guards/auth.guard';
import { HostModerationNotification, Listing, ListingStatus } from '../../shared/models/listing.model';

/** Publicación tal como la devuelve GET /api/listings/pending. */
export interface ApiPendingListing {
  id: string;
  title: string;
  description?: string;
  city?: string;
  maxGuests?: number;
  pricePerNight?: number;
  status: ListingStatus;
  amenities?: string[];
  hostId?: string;
  hostName?: string;
  requestedAt?: string;
  images?: string[];
  blockReason?: string;
}

/** HU-051: nombre de cada estado en la lista de publicaciones del administrador. */
export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  BORRADOR: 'Borrador',
  PENDIENTE_REVISION: 'En revisión',
  ACTIVA: 'Activa',
  PAUSADA: 'Pausada',
  BLOQUEADA: 'Bloqueada',
};

interface ModerationResponse {
  listingId: string;
  status: ListingStatus;
  returnReason?: string;
  blockReason?: string;
  bookingsUnderReview?: string[];
  notification: { id: string; type: 'APROBADA' | 'DEVUELTA' | 'BLOQUEADA'; message: string; reason?: string; createdAt: string };
}

@Component({
  selector: 'app-admin-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="moderation-shell">
      <header class="moderation-header">
        <div>
          <span class="eyebrow">Panel de Administración</span>
          <h1>Cola de revisión de publicaciones</h1>
          <p class="subtitle">
            Revisa las solicitudes pendientes ordenadas por fecha de solicitud, aprueba las que cumplen los estándares
            o devuélvelas a borrador indicando el motivo al anfitrión.
          </p>
        </div>
        <div class="stats-pills">
          <span class="stat-pill pending">Pendientes: {{ pendingQueue.length }}</span>
          <span class="stat-pill active">Aprobadas hoy: {{ activeSearchListings.length }}</span>
          <span class="stat-pill draft">Devueltas hoy: {{ returnedDraftListings.length }}</span>
        </div>
      </header>

      <div class="alert-banner" *ngIf="feedbackMessage" role="status">
        {{ feedbackMessage }}
      </div>

      <div class="alert-error" *ngIf="errorMessage" role="alert">
        {{ errorMessage }}
        <button type="button" class="btn-cancel" (click)="load()">Reintentar</button>
      </div>

      <!-- CA1: Cola ordenada por fecha de solicitud -->
      <section class="queue-section" aria-label="Cola de publicaciones pendientes">
        <h2>Publicaciones en PENDIENTE_REVISION ({{ pendingQueue.length }})</h2>

        <p class="empty-state" *ngIf="loading" role="status">Cargando la cola de revisión…</p>

        <p class="empty-state" *ngIf="!loading && pendingQueue.length === 0">
          No hay publicaciones pendientes por revisar en este momento.
        </p>

        <div class="queue-grid" *ngIf="!loading && pendingQueue.length > 0">
          <article class="queue-card" *ngFor="let item of pendingQueue">
            <div class="card-top">
              <span class="status-badge pending">{{ item.status }}</span>
              <time class="request-date">
                Solicitado: {{ item.requestedAt | date: 'yyyy-MM-dd HH:mm' }}
              </time>
            </div>

            <h3>{{ item.title }}</h3>
            <p class="meta">{{ item.city }} · Anfitrión: {{ item.hostName }} · Capacidad: {{ item.capacity }} huéspedes</p>
            <p class="desc">{{ item.description }}</p>

            <div class="return-box" *ngIf="returningListingId === item.id">
              <label [for]="'reason-' + item.id">Motivo de devolución para el anfitrión (obligatorio):</label>
              <textarea
                [id]="'reason-' + item.id"
                rows="3"
                [(ngModel)]="returnReasonInput"
                placeholder="Ej. Las fotografías están oscuras y falta detallar las reglas de la propiedad..."
              ></textarea>
              <p class="error-msg" *ngIf="returnError">{{ returnError }}</p>
              <div class="return-actions">
                <button type="button" class="btn-confirm-return" [disabled]="busyId === item.id" (click)="confirmReturn(item.id)">
                  Confirmar devolución a BORRADOR
                </button>
                <button type="button" class="btn-cancel" (click)="cancelReturn()">
                  Cancelar
                </button>
              </div>
            </div>

            <div class="card-actions" *ngIf="returningListingId !== item.id">
              <button type="button" class="btn-approve" [disabled]="busyId === item.id" (click)="approveListing(item.id)">
                Aprobar publicación (ACTIVA)
              </button>
              <button type="button" class="btn-return" (click)="openReturnPrompt(item.id)">
                Devolver con motivo
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- HU-051: bloquear una publicación engañosa en cualquier estado -->
      <section class="queue-section block-section" aria-label="Bloquear publicaciones">
        <h2>Bloquear una publicación engañosa</h2>
        <p class="subtitle">
          Bloquea una publicación en cualquier estado indicando el motivo: deja de aparecer en las búsquedas, sus
          reservas futuras pasan a revisión y se notifica al anfitrión y a los huéspedes afectados.
        </p>
        <input
          class="block-filter"
          type="search"
          [(ngModel)]="blockFilter"
          placeholder="Buscar por título, ciudad o anfitrión"
          aria-label="Buscar publicación para bloquear"
        />
        <p class="empty-state" *ngIf="!loading && filteredAllListings.length === 0">No hay publicaciones que coincidan.</p>
        <ul class="block-list" *ngIf="filteredAllListings.length > 0">
          <li class="block-item" *ngFor="let item of filteredAllListings" [attr.data-id]="item.id">
            <div class="block-info">
              <strong>{{ item.title }}</strong>
              <span class="meta">{{ item.city || 'Sin ciudad' }} · {{ item.hostName || 'Anfitrión' }}</span>
              <span class="status-badge" [attr.data-status]="item.status">{{ statusLabel(item.status) }}</span>
              <p class="reason-visible" *ngIf="item.status === 'BLOQUEADA' && item.blockReason">Motivo: "{{ item.blockReason }}"</p>
            </div>

            <div class="return-box" *ngIf="blockingListingId === item.id">
              <label [for]="'block-reason-' + item.id">Motivo del bloqueo (obligatorio):</label>
              <textarea
                [id]="'block-reason-' + item.id"
                rows="3"
                [(ngModel)]="blockReasonInput"
                placeholder="Ej. Las fotografías no corresponden al inmueble y la dirección es falsa..."
              ></textarea>
              <p class="error-msg" *ngIf="blockError">{{ blockError }}</p>
              <div class="return-actions">
                <button type="button" class="btn-confirm-return" [disabled]="busyId === item.id" (click)="confirmBlock(item.id)">
                  {{ busyId === item.id ? 'Bloqueando…' : 'Confirmar bloqueo' }}
                </button>
                <button type="button" class="btn-cancel" (click)="cancelBlock()">Cancelar</button>
              </div>
            </div>

            <button
              type="button"
              class="btn-block"
              *ngIf="item.status !== 'BLOQUEADA' && blockingListingId !== item.id"
              (click)="openBlockPrompt(item.id)"
            >
              Bloquear
            </button>
          </li>
        </ul>
      </section>

      <!-- CA2 & CA3: Trazabilidad de resultados (Búsqueda pública, Borradores del anfitrión y Notificaciones) -->
      <div class="outcomes-grid">
        <section class="outcome-panel">
          <h3>Publicaciones activas en búsqueda</h3>
          <p class="empty-inline" *ngIf="activeSearchListings.length === 0">
            Aún no apruebas publicaciones en esta visita.
          </p>
          <ul class="outcome-list" *ngIf="activeSearchListings.length > 0">
            <li *ngFor="let active of activeSearchListings">
              <strong>{{ active.title }}</strong> ({{ active.city }}) —
              <span class="badge-ok">{{ active.status }}</span>
            </li>
          </ul>
        </section>

        <section class="outcome-panel">
          <h3>Publicaciones devueltas (Borrador)</h3>
          <p class="empty-inline" *ngIf="returnedDraftListings.length === 0">
            Aún no devuelves publicaciones en esta visita.
          </p>
          <ul class="outcome-list" *ngIf="returnedDraftListings.length > 0">
            <li *ngFor="let draft of returnedDraftListings">
              <div>
                <strong>{{ draft.title }}</strong> —
                <span class="badge-draft">{{ draft.status }}</span>
              </div>
              <p class="reason-visible">Motivo visible para {{ draft.hostName }}: "{{ draft.returnReason }}"</p>
            </li>
          </ul>
        </section>
      </div>

      <section class="notifications-panel" *ngIf="notifications.length > 0">
        <h3>Notificaciones enviadas a anfitriones ({{ notifications.length }})</h3>
        <ul class="notif-list">
          <li *ngFor="let n of notifications">
            <span class="notif-tag" [class.approved]="n.type === 'APROBADA'" [class.returned]="n.type !== 'APROBADA'">
              {{ n.type }}
            </span>
            <strong>{{ n.hostName }}:</strong> {{ n.message }}
          </li>
        </ul>
      </section>
    </section>
  `,
  styles: [`
    .moderation-shell {
      max-width: 1180px;
      margin: 0 auto;
      padding: 36px 24px 72px;
      color: #1d1d1f;
    }
    .moderation-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
      flex-wrap: wrap;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e5e5ea;
    }
    .eyebrow {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #86868b;
    }
    h1 {
      margin: 6px 0 8px;
      font-size: 2rem;
      letter-spacing: -0.03em;
    }
    .subtitle {
      margin: 0;
      max-width: 640px;
      color: #6e6e73;
      line-height: 1.5;
    }
    .stats-pills {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .stat-pill {
      padding: 6px 14px;
      border-radius: 980px;
      font-size: 0.78rem;
      font-weight: 600;
      background: #f5f5f7;
    }
    .stat-pill.pending { background: #fff4e5; color: #9a5b00; }
    .alert-error {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 13px 16px;
      margin-bottom: 18px;
      border-radius: 12px;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .stat-pill.active { background: #e8f8ee; color: #166534; }
    .stat-pill.draft { background: #fef2f2; color: #991b1b; }
    .alert-banner {
      padding: 14px 18px;
      border-radius: 14px;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 0.88rem;
      margin-bottom: 24px;
    }
    .queue-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }
    .queue-card {
      background: #ffffff;
      border: 1px solid #e5e5ea;
      border-radius: 20px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.76rem;
    }
    .status-badge {
      padding: 4px 10px;
      border-radius: 980px;
      font-weight: 700;
      background: #fff4e5;
      color: #9a5b00;
    }
    .request-date { color: #86868b; }
    .meta { margin: 0; font-size: 0.8rem; color: #6e6e73; font-weight: 600; }
    .desc { margin: 0; font-size: 0.88rem; color: #3a3a3c; line-height: 1.45; flex: 1; }
    .card-actions, .return-actions {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    button {
      border-radius: 980px;
      padding: 9px 16px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .btn-approve { background: #1d1d1f; color: #ffffff; }
    .btn-return { background: #ffffff; color: #1d1d1f; border-color: #d2d2d7; }
    .btn-confirm-return { background: #b91c1c; color: #ffffff; }
    .btn-cancel { background: #f5f5f7; color: #1d1d1f; }
    .return-box {
      margin-top: 8px;
      padding: 12px;
      background: #f5f5f7;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .return-box label { font-size: 0.78rem; font-weight: 600; }
    .return-box textarea {
      width: 100%;
      border-radius: 8px;
      border: 1px solid #d2d2d7;
      padding: 8px;
      font-family: inherit;
      font-size: 0.84rem;
    }
    .error-msg { margin: 0; color: #b91c1c; font-size: 0.78rem; font-weight: 600; }
    .outcomes-grid {
      margin-top: 32px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
    }
    .outcome-panel, .notifications-panel {
      background: #ffffff;
      border: 1px solid #e5e5ea;
      border-radius: 18px;
      padding: 20px;
      margin-top: 20px;
    }
    .outcome-list, .notif-list {
      margin: 12px 0 0;
      padding-left: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 0.86rem;
    }
    .badge-ok { color: #166534; font-weight: 700; }
    .badge-draft { color: #991b1b; font-weight: 700; }
    .reason-visible { margin: 4px 0 0; color: #6e6e73; font-style: italic; }
    .notif-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 980px;
      font-size: 0.72rem;
      font-weight: 700;
      margin-right: 6px;
    }
    .notif-tag.approved { background: #e8f8ee; color: #166534; }
    .block-section { margin-top: 36px; }
    .block-filter {
      width: 100%;
      max-width: 420px;
      margin: 14px 0;
      padding: 9px 14px;
      border-radius: 980px;
      border: 1px solid #d2d2d7;
      font: inherit;
      font-size: 0.86rem;
    }
    .block-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .block-item {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: #ffffff;
      border: 1px solid #e5e5ea;
      border-radius: 16px;
    }
    .block-item .return-box { flex-basis: 100%; }
    .block-info { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
    .block-info .reason-visible { flex-basis: 100%; }
    .status-badge[data-status='ACTIVA'] { background: #e8f8ee; color: #166534; }
    .status-badge[data-status='BORRADOR'], .status-badge[data-status='PAUSADA'] { background: #f5f5f7; color: #3a3a3c; }
    .status-badge[data-status='BLOQUEADA'] { background: #fef2f2; color: #991b1b; }
    .btn-block { background: #ffffff; color: #b91c1c; border-color: #fecaca; }
    .notif-tag.returned { background: #fef2f2; color: #991b1b; }
  `],
})
export class AdminModerationComponent implements OnInit {
  /** Pendientes cargadas del API y, en esta visita, las que el administrador aprobó o devolvió. */
  listings: Listing[] = [];
  notifications: HostModerationNotification[] = [];
  loading = false;
  busyId: string | null = null;
  errorMessage = '';
  returningListingId: string | null = null;
  returnReasonInput = '';
  returnError = '';
  feedbackMessage = '';
  /** HU-051: todas las publicaciones (cualquier estado) para bloquear las engañosas. */
  allListings: ApiPendingListing[] = [];
  blockFilter = '';
  blockingListingId: string | null = null;
  blockReasonInput = '';
  blockError = '';

  ngOnInit(): void {
    void this.load();
  }

  /**
   * CA1: Dado que hay publicaciones en PENDIENTE_REVISION, cuando abro la cola de revisión,
   * entonces las veo ordenadas por fecha de solicitud (ascendente).
   */
  get pendingQueue(): Listing[] {
    return this.listings
      .filter((item) => item.status === 'PENDIENTE_REVISION')
      .sort((a, b) => {
        const dateA = a.requestedAt ? new Date(a.requestedAt).getTime() : 0;
        const dateB = b.requestedAt ? new Date(b.requestedAt).getTime() : 0;
        return dateA - dateB;
      });
  }

  /** CA2: publicaciones aprobadas en esta visita, que ya están ACTIVAS en las búsquedas. */
  get activeSearchListings(): Listing[] {
    return this.listings.filter((item) => item.status === 'ACTIVA');
  }

  /** CA3: publicaciones devueltas en esta visita, que pasaron a BORRADOR con motivo para el anfitrión. */
  get returnedDraftListings(): Listing[] {
    return this.listings.filter((item) => item.status === 'BORRADOR');
  }

  get filteredAllListings(): ApiPendingListing[] {
    const term = this.blockFilter.trim().toLowerCase();
    if (!term) return this.allListings;
    return this.allListings.filter((item) =>
      [item.title, item.city, item.hostName].some((value) => value?.toLowerCase().includes(term)),
    );
  }

  statusLabel(status: ListingStatus): string {
    return LISTING_STATUS_LABELS[status] ?? status;
  }

  toListing(item: ApiPendingListing): Listing {
    return {
      id: item.id,
      title: item.title,
      description: item.description ?? '',
      city: item.city ?? '',
      capacity: item.maxGuests ?? 0,
      pricePerNight: item.pricePerNight ?? 0,
      status: item.status,
      amenities: item.amenities ?? [],
      hostId: item.hostId,
      hostName: item.hostName || 'Anfitrión',
      requestedAt: item.requestedAt,
      imageUrl: item.images?.[0],
    };
  }

  private authHeaders(): Record<string, string> {
    const token = getActiveSession()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private apiError(status: number, body: { message?: string | string[] }, fallback: string): string {
    if (status === 401) {
      return 'Tu sesión expiró. Inicia sesión de nuevo como administrador.';
    }
    if (status === 403) {
      return 'Solo el administrador puede revisar publicaciones.';
    }
    return [body?.message].flat().filter(Boolean).join(' ') || fallback;
  }

  /** CA1: carga la cola real de PENDIENTE_REVISION desde el API. */
  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await fetch('/api/listings/pending', { headers: this.authHeaders() });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.errorMessage = this.apiError(response.status, body, 'No fue posible cargar la cola de revisión.');
        return;
      }
      const reviewed = this.listings.filter((item) => item.status !== 'PENDIENTE_REVISION');
      this.listings = [...(body as ApiPendingListing[]).map((item) => this.toListing(item)), ...reviewed];
      await this.loadAll();
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  /** HU-051: carga todas las publicaciones, en cualquier estado. */
  async loadAll(): Promise<void> {
    const response = await fetch('/api/listings/admin/all', { headers: this.authHeaders() });
    if (response.ok) {
      this.allListings = (await response.json()) as ApiPendingListing[];
    }
  }

  openBlockPrompt(id: string): void {
    this.blockingListingId = id;
    this.blockReasonInput = '';
    this.blockError = '';
  }

  cancelBlock(): void {
    this.blockingListingId = null;
    this.blockReasonInput = '';
    this.blockError = '';
  }

  /**
   * HU-051 CA1, CA2, CA3: bloquea la publicación con el motivo; el API la saca de las búsquedas, pasa sus reservas
   * futuras a EN_REVISION y notifica al anfitrión y a los huéspedes afectados.
   */
  async confirmBlock(id: string): Promise<void> {
    const reason = this.blockReasonInput.trim();
    if (reason.length < 5) {
      this.blockError = 'Indica el motivo del bloqueo (al menos 5 caracteres).';
      return;
    }
    const item = this.allListings.find((listing) => listing.id === id);
    if (!item) return;

    this.busyId = id;
    this.blockError = '';
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(id)}/block`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ reason }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.blockError = this.apiError(response.status, body, 'No fue posible bloquear la publicación.');
        return;
      }
      const result = body as ModerationResponse;
      item.status = result.status;
      item.blockReason = result.blockReason;
      this.listings = this.listings.filter((listing) => listing.id !== id);
      this.notifications.unshift({
        id: result.notification.id,
        listingId: id,
        listingTitle: item.title,
        hostName: item.hostName || 'Anfitrión',
        type: result.notification.type,
        message: result.notification.message,
        reason: result.notification.reason,
        createdAt: result.notification.createdAt,
      });
      const affected = result.bookingsUnderReview ?? [];
      this.feedbackMessage =
        `Publicación "${item.title}" BLOQUEADA: ya no aparece en las búsquedas y se notificó al anfitrión.` +
        (affected.length > 0
          ? ` ${affected.length} reserva(s) futura(s) pasaron a EN_REVISION (${affected.join(', ')}) y se avisó a sus huéspedes.`
          : ' No tenía reservas futuras.');
      this.cancelBlock();
    } catch {
      this.blockError = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.busyId = null;
    }
  }

  /** Envía la decisión al API y, si se guarda, actualiza la publicación y la notificación al anfitrión. */
  private async moderate(id: string, action: 'approve' | 'return', reason?: string): Promise<ModerationResponse | null> {
    this.busyId = id;
    this.errorMessage = '';
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(id)}/${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: action === 'return' ? JSON.stringify({ reason }) : undefined,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = this.apiError(response.status, body, 'No fue posible guardar la decisión.');
        if (action === 'return') {
          this.returnError = message;
        } else {
          this.errorMessage = message;
        }
        return null;
      }
      return body as ModerationResponse;
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
      return null;
    } finally {
      this.busyId = null;
    }
  }

  private applyDecision(item: Listing, result: ModerationResponse): void {
    item.status = result.status;
    item.returnReason = result.returnReason;
    this.notifications.unshift({
      id: result.notification.id,
      listingId: item.id,
      listingTitle: item.title,
      hostName: item.hostName || 'Anfitrión',
      type: result.notification.type,
      message: result.notification.message,
      reason: result.notification.reason,
      createdAt: result.notification.createdAt,
    });
  }

  async approveListing(id: string): Promise<void> {
    const item = this.listings.find((l) => l.id === id);
    if (!item || item.status !== 'PENDIENTE_REVISION') {
      return;
    }

    const result = await this.moderate(id, 'approve');
    if (!result) {
      return;
    }
    this.applyDecision(item, result);
    this.feedbackMessage = `Publicación "${item.title}" aprobada: ya está ACTIVA en las búsquedas y se notificó al anfitrión.`;
  }

  openReturnPrompt(id: string): void {
    this.returningListingId = id;
    this.returnReasonInput = '';
    this.returnError = '';
  }

  cancelReturn(): void {
    this.returningListingId = null;
    this.returnReasonInput = '';
    this.returnError = '';
  }

  async confirmReturn(id: string): Promise<void> {
    const reason = this.returnReasonInput.trim();
    if (!reason) {
      this.returnError = 'Debes ingresar un motivo de devolución para el anfitrión.';
      return;
    }

    const item = this.listings.find((l) => l.id === id);
    if (!item || item.status !== 'PENDIENTE_REVISION') {
      return;
    }

    const result = await this.moderate(id, 'return', reason);
    if (!result) {
      return;
    }
    this.applyDecision(item, result);
    this.feedbackMessage = `Publicación "${item.title}" devuelta a BORRADOR. El anfitrión verá el motivo en Mis publicaciones.`;
    this.cancelReturn();
  }
}
