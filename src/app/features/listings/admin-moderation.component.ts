import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HostModerationNotification, Listing } from '../../shared/models/listing.model';

@Component({
  selector: 'app-admin-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="moderation-shell">
      <header class="moderation-header">
        <div>
          <span class="eyebrow">HU-050 · Panel de Administración</span>
          <h1>Cola de revisión de publicaciones</h1>
          <p class="subtitle">
            Revisa las solicitudes pendientes ordenadas por fecha de solicitud, aprueba las que cumplen los estándares
            o devuélvelas a borrador indicando el motivo al anfitrión.
          </p>
        </div>
        <div class="stats-pills">
          <span class="stat-pill pending">Pendientes: {{ pendingQueue.length }}</span>
          <span class="stat-pill active">Activas en búsqueda: {{ activeSearchListings.length }}</span>
          <span class="stat-pill draft">Devueltas (Borrador): {{ returnedDraftListings.length }}</span>
        </div>
      </header>

      <div class="alert-banner" *ngIf="feedbackMessage" role="status">
        {{ feedbackMessage }}
      </div>

      <!-- CA1: Cola ordenada por fecha de solicitud -->
      <section class="queue-section" aria-label="Cola de publicaciones pendientes">
        <h2>Publicaciones en PENDIENTE_REVISION ({{ pendingQueue.length }})</h2>

        <p class="empty-state" *ngIf="pendingQueue.length === 0">
          No hay publicaciones pendientes por revisar en este momento.
        </p>

        <div class="queue-grid" *ngIf="pendingQueue.length > 0">
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
                <button type="button" class="btn-confirm-return" (click)="confirmReturn(item.id)">
                  Confirmar devolución a BORRADOR
                </button>
                <button type="button" class="btn-cancel" (click)="cancelReturn()">
                  Cancelar
                </button>
              </div>
            </div>

            <div class="card-actions" *ngIf="returningListingId !== item.id">
              <button type="button" class="btn-approve" (click)="approveListing(item.id)">
                Aprobar publicación (ACTIVA)
              </button>
              <button type="button" class="btn-return" (click)="openReturnPrompt(item.id)">
                Devolver con motivo
              </button>
            </div>
          </article>
        </div>
      </section>

      <!-- CA2 & CA3: Trazabilidad de resultados (Búsqueda pública, Borradores del anfitrión y Notificaciones) -->
      <div class="outcomes-grid">
        <section class="outcome-panel">
          <h3>CA2 · Visibles en búsquedas (Estado ACTIVA)</h3>
          <p class="empty-inline" *ngIf="activeSearchListings.length === 0">
            Ninguna publicación aprobada en esta sesión aún.
          </p>
          <ul class="outcome-list" *ngIf="activeSearchListings.length > 0">
            <li *ngFor="let active of activeSearchListings">
              <strong>{{ active.title }}</strong> ({{ active.city }}) —
              <span class="badge-ok">{{ active.status }}</span>
            </li>
          </ul>
        </section>

        <section class="outcome-panel">
          <h3>CA3 · Vista del Anfitrión (Borradores devueltos y motivos)</h3>
          <p class="empty-inline" *ngIf="returnedDraftListings.length === 0">
            Ninguna publicación devuelta en esta sesión aún.
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
            <span class="notif-tag" [class.approved]="n.type === 'APROBADA'" [class.returned]="n.type === 'DEVUELTA'">
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
    .notif-tag.returned { background: #fef2f2; color: #991b1b; }
  `],
})
export class AdminModerationComponent {
  listings: Listing[] = [
    {
      id: 'pending-listing-2',
      title: 'Cabaña Alpina en Santa Elena',
      description: 'Cabaña rodeada de bosque nativo con chimenea y deck panorámico.',
      city: 'Medellín',
      capacity: 4,
      pricePerNight: 380000,
      status: 'PENDIENTE_REVISION',
      amenities: ['WIFI', 'CHIMENEA'],
      hostId: 'host-2',
      hostName: 'Carlos Mendoza',
      requestedAt: '2026-10-16T14:30:00.000Z',
    },
    {
      id: 'pending-listing-1',
      title: 'Ático Minimalista en Laureles',
      description: 'Iluminación cenital, terraza privada y estudio insonorizado.',
      city: 'Medellín',
      capacity: 2,
      pricePerNight: 290000,
      status: 'PENDIENTE_REVISION',
      amenities: ['WIFI', 'AC'],
      hostId: 'host-1',
      hostName: 'Laura Restrepo',
      requestedAt: '2026-10-14T08:15:00.000Z',
    },
    {
      id: 'pending-listing-3',
      title: 'Casa Colonial frente al Mar',
      description: 'Arquitectura republicana restaurada con piscina interior.',
      city: 'Cartagena',
      capacity: 6,
      pricePerNight: 650000,
      status: 'PENDIENTE_REVISION',
      amenities: ['WIFI', 'PISCINA'],
      hostId: 'host-3',
      hostName: 'Andrés Salgado',
      requestedAt: '2026-10-18T19:45:00.000Z',
    },
  ];

  notifications: HostModerationNotification[] = [];
  returningListingId: string | null = null;
  returnReasonInput = '';
  returnError = '';
  feedbackMessage = '';

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

  /**
   * CA2: Publicaciones aprobadas que pasan a ACTIVA y aparecen en las búsquedas.
   */
  get activeSearchListings(): Listing[] {
    return this.listings.filter((item) => item.status === 'ACTIVA');
  }

  /**
   * CA3: Publicaciones devueltas que pasan a BORRADOR con motivo visible para el anfitrión.
   */
  get returnedDraftListings(): Listing[] {
    return this.listings.filter((item) => item.status === 'BORRADOR');
  }

  approveListing(id: string): void {
    const item = this.listings.find((l) => l.id === id);
    if (!item || item.status !== 'PENDIENTE_REVISION') {
      return;
    }

    item.status = 'ACTIVA';
    item.returnReason = undefined;

    const notif: HostModerationNotification = {
      id: `notif-${Date.now()}`,
      listingId: item.id,
      listingTitle: item.title,
      hostName: item.hostName || 'Anfitrión',
      type: 'APROBADA',
      message: `Tu publicación "${item.title}" ha sido aprobada, pasó a ACTIVA y ya aparece en las búsquedas.`,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(notif);
    this.feedbackMessage = `Publicación "${item.title}" aprobada (ACTIVA) y anfitrión notificado.`;
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

  confirmReturn(id: string): void {
    const reason = this.returnReasonInput.trim();
    if (!reason) {
      this.returnError = 'Debes ingresar un motivo de devolución para el anfitrión.';
      return;
    }

    const item = this.listings.find((l) => l.id === id);
    if (!item || item.status !== 'PENDIENTE_REVISION') {
      return;
    }

    item.status = 'BORRADOR';
    item.returnReason = reason;

    const notif: HostModerationNotification = {
      id: `notif-${Date.now()}`,
      listingId: item.id,
      listingTitle: item.title,
      hostName: item.hostName || 'Anfitrión',
      type: 'DEVUELTA',
      message: `Tu publicación "${item.title}" pasó a BORRADOR. Motivo de devolución: ${reason}`,
      reason,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(notif);
    this.feedbackMessage = `Publicación "${item.title}" devuelta a BORRADOR con motivo registrado.`;
    this.cancelReturn();
  }
}
