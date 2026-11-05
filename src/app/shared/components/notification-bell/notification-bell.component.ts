import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { getActiveSession } from '../../../core/guards/auth.guard';

/** Notificación tal como la devuelve GET /api/notifications (HU-043 CA3, HU-044 CA1/CA2, HU-045 CA1/CA2). */
export interface AppNotification {
  id: string;
  type: string;
  message: string;
  entity: 'Booking' | 'Listing' | 'UserAccount' | 'Review';
  entityId: string;
  bookingCode?: string;
  createdAt: string;
  read: boolean;
  readAt?: string;
}

export const NOTIFICATION_LABELS: Record<string, string> = {
  RESERVA_CONFIRMADA: 'Reserva confirmada',
  SOLICITUD_RESERVA: 'Solicitud de reserva',
  SOLICITUD_RECHAZADA: 'Solicitud rechazada',
  PAGO_RECHAZADO: 'Pago rechazado',
  RESERVA_CANCELADA: 'Reserva cancelada',
  RESERVA_EN_REVISION: 'Reserva en revisión',
  RESERVA_MANTENIDA: 'Reserva mantenida',
  RESERVA_COMPLETADA: 'Estancia completada',
  PUBLICACION_APROBADA: 'Publicación aprobada',
  PUBLICACION_DEVUELTA: 'Publicación devuelta',
  PUBLICACION_BLOQUEADA: 'Publicación bloqueada',
  CUENTA_RESTRINGIDA: 'Cuenta restringida',
  RESENA_OCULTADA: 'Reseña moderada',
};

/** Cada cuánto se revisa si llegaron notificaciones nuevas. */
export const NOTIFICATIONS_REFRESH_MS = 30_000;
export const DEFAULT_NOTIFICATIONS_PAGE_SIZE = 10;

/**
 * HU-043 · Recibir notificaciones de los eventos (CA1, CA2, CA3 · RF-059).
 * HU-044 · Consultar mis notificaciones (CA1, CA2 · RF-060, RNF-022).
 * HU-045 · Marcar notificaciones como leídas (CA1, CA2 · RF-061).
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bell-wrap">
      <button type="button" class="bell" (click)="toggle($event)" [attr.aria-expanded]="open" aria-label="Notificaciones">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" />
        </svg>
        <span class="badge" *ngIf="unread > 0" aria-label="Notificaciones sin leer">{{ unread > 9 ? '9+' : unread }}</span>
      </button>

      <div class="panel" *ngIf="open" (click)="$event.stopPropagation()" role="dialog" aria-label="Notificaciones">
        <div class="panel-header">
          <div class="title-group">
            <strong>Notificaciones</strong>
            <span class="unread-pill" *ngIf="unread > 0">{{ unread }} sin leer</span>
          </div>
          <button type="button" class="link" *ngIf="unread > 0" (click)="markAllAsRead()">Marcar todas como leídas</button>
        </div>

        <div class="toolbar">
          <div class="filters" role="tablist" aria-label="Filtro de notificaciones">
            <button type="button" class="filter-btn" [class.active]="!onlyUnread" (click)="setFilter(false)">Todas</button>
            <button type="button" class="filter-btn" [class.active]="onlyUnread" (click)="setFilter(true)">
              No leídas ({{ unread }})
            </button>
          </div>
          <button
            type="button"
            class="batch-btn"
            *ngIf="selectedIds.size > 0"
            (click)="markSelectedAsRead()"
          >
            Marcar seleccionadas ({{ selectedIds.size }})
          </button>
        </div>

        <p class="empty" *ngIf="visibleNotifications.length === 0">
          {{ onlyUnread ? 'No tienes notificaciones sin leer.' : 'No tienes notificaciones.' }}
        </p>

        <ul>
          <li *ngFor="let item of visibleNotifications" [class.unread]="!item.read">
            <div class="item-row">
              <label class="select-box" *ngIf="!item.read" (click)="$event.stopPropagation()">
                <input
                  type="checkbox"
                  [checked]="selectedIds.has(item.id)"
                  (change)="toggleSelection(item.id, $event)"
                  aria-label="Seleccionar notificación"
                />
              </label>
              <button type="button" class="item" (click)="openNotification(item)">
                <span class="dot" *ngIf="!item.read" aria-label="Sin leer"></span>
                <span class="content">
                  <span class="meta-row">
                    <span class="type">{{ label(item.type) }}</span>
                    <span class="new-tag" *ngIf="!item.read">Nueva</span>
                  </span>
                  <span class="message">{{ item.message }}</span>
                  <span class="date">{{ formatDate(item.createdAt) }}</span>
                </span>
              </button>
              <button
                type="button"
                class="mark-one-btn"
                *ngIf="!item.read"
                (click)="markOneAsRead(item, $event)"
                title="Marcar como leída"
              >
                Leída
              </button>
            </div>
          </li>
        </ul>

        <div class="pagination" *ngIf="totalPages > 1" aria-label="Paginación de notificaciones">
          <button type="button" class="page-btn" [disabled]="page <= 1" (click)="goToPage(page - 1)">Anterior</button>
          <span class="page-info">Página {{ page }} de {{ totalPages }}</span>
          <button type="button" class="page-btn" [disabled]="page >= totalPages" (click)="goToPage(page + 1)">Siguiente</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .bell-wrap { position: relative; }
      .bell { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #d2d2d7; background: #f5f5f7; color: #1d1d1f; cursor: pointer; }
      .badge { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 999px; background: #e11d48; color: #fff; font-size: 0.68rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
      .panel { position: absolute; right: 0; top: 44px; width: min(390px, calc(100vw - 32px)); max-height: 72vh; overflow-y: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.15); z-index: 1000; }
      .panel-header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.9rem 1rem; border-bottom: 1px solid #f1f5f9; }
      .title-group { display: inline-flex; align-items: center; gap: 0.45rem; }
      .unread-pill { background: #eff6ff; color: #1d4ed8; font-size: 0.72rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 999px; }
      .link { background: none; border: none; color: #0071e3; font-size: 0.78rem; font-weight: 600; cursor: pointer; padding: 0; }
      .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.55rem 1rem; border-bottom: 1px solid #f1f5f9; background: #f8fafc; flex-wrap: wrap; }
      .filters { display: inline-flex; gap: 0.35rem; }
      .filter-btn { border: 1px solid #cbd5e1; background: #fff; color: #475569; border-radius: 999px; padding: 0.2rem 0.65rem; font-size: 0.74rem; font-weight: 600; cursor: pointer; }
      .filter-btn.active { background: #0f172a; border-color: #0f172a; color: #fff; }
      .batch-btn { border: none; background: #0071e3; color: #fff; border-radius: 999px; padding: 0.24rem 0.7rem; font-size: 0.74rem; font-weight: 600; cursor: pointer; }
      .empty { padding: 1rem; color: #64748b; margin: 0; font-size: 0.85rem; }
      ul { list-style: none; margin: 0; padding: 0; }
      li + li { border-top: 1px solid #f1f5f9; }
      li.unread { background: #f5f9ff; }
      .item-row { display: flex; align-items: flex-start; gap: 0.35rem; padding: 0 0.75rem 0 0.65rem; }
      .select-box { display: inline-flex; align-items: center; padding-top: 0.9rem; cursor: pointer; }
      .item { display: flex; gap: 0.55rem; flex: 1; text-align: left; background: none; border: none; padding: 0.8rem 0.35rem; cursor: pointer; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: #0071e3; margin-top: 0.38rem; flex-shrink: 0; }
      .content { display: flex; flex-direction: column; gap: 0.2rem; }
      .meta-row { display: inline-flex; align-items: center; gap: 0.4rem; }
      .type { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
      .new-tag { background: #dbeafe; color: #1e40af; font-size: 0.65rem; font-weight: 700; padding: 0.05rem 0.38rem; border-radius: 999px; }
      .message { font-size: 0.86rem; color: #1d1d1f; }
      .date { font-size: 0.72rem; color: #94a3b8; }
      .mark-one-btn { align-self: center; border: 1px solid #bfdbfe; background: #fff; color: #0071e3; border-radius: 8px; padding: 0.22rem 0.5rem; font-size: 0.72rem; font-weight: 600; cursor: pointer; flex-shrink: 0; }
      .pagination { display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 1rem; border-top: 1px solid #f1f5f9; background: #f8fafc; }
      .page-btn { border: 1px solid #cbd5e1; background: #fff; color: #1e293b; border-radius: 8px; padding: 0.25rem 0.6rem; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
      .page-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .page-info { font-size: 0.75rem; color: #475569; font-weight: 500; }
    `,
  ],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  unread = 0;
  open = false;
  onlyUnread = false;
  selectedIds = new Set<string>();
  page = 1;
  limit = DEFAULT_NOTIFICATIONS_PAGE_SIZE;
  total = 0;
  totalPages = 1;
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly router?: Router) {}

  get visibleNotifications(): AppNotification[] {
    const filtered = this.onlyUnread ? this.notifications.filter((item) => !item.read) : this.notifications;
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (sorted.length > this.limit) {
      const start = (this.page - 1) * this.limit;
      return sorted.slice(start, start + this.limit);
    }
    return sorted;
  }

  ngOnInit(): void {
    void this.load();
    this.timer = setInterval(() => void this.load(), NOTIFICATIONS_REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  @HostListener('document:click')
  close(): void {
    this.open = false;
  }

  toggle(event: Event): void {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) void this.load();
  }

  async load(): Promise<void> {
    const params = new URLSearchParams();
    if (this.onlyUnread) params.set('unread', 'true');
    if (this.page > 1) {
      params.set('page', String(this.page));
      params.set('limit', String(this.limit));
    }
    const query = params.toString();
    const url = query ? `/api/notifications?${query}` : '/api/notifications';
    const response = await this.request(url);
    if (!response?.ok) return;
    const body = (await response.json()) as {
      data: AppNotification[];
      unread: number;
      page?: number;
      limit?: number;
      total?: number;
      totalPages?: number;
    };
    this.notifications = [...(body.data ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    this.unread = body.unread ?? 0;
    this.total = body.total ?? this.notifications.length;
    this.totalPages = body.totalPages ?? Math.max(1, Math.ceil(this.total / this.limit));
    const unreadIds = new Set(this.notifications.filter((n) => !n.read).map((n) => n.id));
    this.selectedIds = new Set([...this.selectedIds].filter((id) => unreadIds.has(id)));
  }

  /** HU-045 CA1: consulta ligera del contador de notificaciones no leídas. */
  async refreshUnreadCount(): Promise<void> {
    const response = await this.request('/api/notifications/unread-count');
    if (!response?.ok) return;
    const body = (await response.json()) as { unread?: number };
    if (typeof body.unread === 'number') {
      this.unread = body.unread;
    }
  }

  /** HU-045 CA2: alternar filtro entre todas y solo no leídas para distinguir las nuevas. */
  async setFilter(onlyUnread: boolean): Promise<void> {
    if (this.onlyUnread === onlyUnread) return;
    this.onlyUnread = onlyUnread;
    this.page = 1;
    await this.load();
  }

  /** HU-045 CA2: seleccionar o deseleccionar notificaciones para marcado múltiple. */
  toggleSelection(id: string, event: Event): void {
    event.stopPropagation();
    const checked = (event.target as HTMLInputElement | null)?.checked;
    if (checked ?? !this.selectedIds.has(id)) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
  }

  /** HU-044 CA1: cambiar de página en el panel de notificaciones. */
  async goToPage(targetPage: number): Promise<void> {
    if (targetPage < 1 || targetPage > this.totalPages || targetPage === this.page) return;
    this.page = targetPage;
    await this.load();
  }

  /** HU-045 CA2: marcar una notificación individual como leída sin salir del panel. */
  async markOneAsRead(item: AppNotification, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (item.read) return;
    const response = await this.request(`/api/notifications/${encodeURIComponent(item.id)}/read`, 'PATCH');
    if (response?.ok) {
      item.read = true;
      this.selectedIds.delete(item.id);
      this.unread = Math.max(0, this.unread - 1);
    }
  }

  /** HU-045 CA2: marcar una o varias notificaciones seleccionadas como leídas y actualizar el contador. */
  async markSelectedAsRead(): Promise<void> {
    const ids = [...this.selectedIds];
    if (ids.length === 0) return;
    const response = await this.request('/api/notifications/read', 'PATCH', { ids });
    if (!response?.ok) return;
    const body = (await response.json()) as { updated?: number; unread?: number };
    const markedSet = new Set(ids);
    let newlyMarked = 0;
    this.notifications.forEach((item) => {
      if (markedSet.has(item.id) && !item.read) {
        item.read = true;
        newlyMarked += 1;
      }
    });
    this.selectedIds.clear();
    this.unread = typeof body.unread === 'number' ? body.unread : Math.max(0, this.unread - newlyMarked);
  }

  /** HU-043 CA3 / HU-044 CA2: abrir una notificación la marca como leída y navega al detalle de la reserva o publicación relacionada. */
  async openNotification(item: AppNotification): Promise<void> {
    if (!item.read) {
      await this.markOneAsRead(item);
    }
    const route = this.routeFor(item);
    if (route) {
      this.open = false;
      void this.router?.navigateByUrl(route);
    }
  }

  async markAllAsRead(): Promise<void> {
    const response = await this.request('/api/notifications/read-all', 'PATCH');
    if (response?.ok) {
      const body = (await response.json().catch(() => ({}))) as { unread?: number };
      this.notifications.forEach((item) => (item.read = true));
      this.selectedIds.clear();
      this.unread = typeof body.unread === 'number' ? body.unread : 0;
    }
  }

  routeFor(item: AppNotification): string | null {
    if (!item.entityId) return null;
    const role = getActiveSession()?.role;
    if (item.type === 'RESERVA_COMPLETADA' && role === 'HUESPED') return '/mis-reservas';
    if (item.entity === 'Booking' && role === 'HUESPED') return `/mis-reservas/${item.entityId}`;
    if (item.type === 'SOLICITUD_RESERVA' && role === 'ANFITRION') return `/anfitrion/reservas/${item.entityId}`;
    if (item.entity === 'Booking' && role === 'ANFITRION') return '/anfitrion/publicaciones';
    if (item.entity === 'Listing' && item.type === 'PUBLICACION_APROBADA') return `/listings/${item.entityId}`;
    if (item.entity === 'Listing' && role === 'ANFITRION') return '/anfitrion/mis-publicaciones';
    if (item.entity === 'Listing') return `/listings/${item.entityId}`;
    return null;
  }

  label(type: string): string {
    return NOTIFICATION_LABELS[type] ?? 'Notificación';
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(iso));
  }

  private async request(url: string, method = 'GET', body?: unknown): Promise<Response | null> {
    const session = getActiveSession();
    if (!session) return null;
    const headers: Record<string, string> = { Authorization: `Bearer ${session.token}` };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    try {
      return await fetch(url, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      return null;
    }
  }
}
