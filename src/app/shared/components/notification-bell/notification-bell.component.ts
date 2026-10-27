import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { getActiveSession } from '../../../core/guards/auth.guard';

/** Notificación tal como la devuelve GET /api/notifications (HU-043 CA3). */
export interface AppNotification {
  id: string;
  type: string;
  message: string;
  entity: 'Booking' | 'Listing' | 'UserAccount';
  entityId: string;
  bookingCode?: string;
  createdAt: string;
  read: boolean;
  readAt?: string;
}

export const NOTIFICATION_LABELS: Record<string, string> = {
  RESERVA_CONFIRMADA: 'Reserva confirmada',
  RESERVA_CANCELADA: 'Reserva cancelada',
  RESERVA_EN_REVISION: 'Reserva en revisión',
  PUBLICACION_APROBADA: 'Publicación aprobada',
  PUBLICACION_DEVUELTA: 'Publicación devuelta',
  PUBLICACION_BLOQUEADA: 'Publicación bloqueada',
  CUENTA_RESTRINGIDA: 'Cuenta restringida',
};

/** Cada cuánto se revisa si llegaron notificaciones nuevas. */
export const NOTIFICATIONS_REFRESH_MS = 30_000;

/**
 * HU-043 · Recibir notificaciones de los eventos (CA1, CA2, CA3 · RF-059).
 * Campana de la barra superior con el número de notificaciones sin leer y la lista de cada usuario.
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
        <span class="badge" *ngIf="unread > 0">{{ unread > 9 ? '9+' : unread }}</span>
      </button>

      <div class="panel" *ngIf="open" (click)="$event.stopPropagation()" role="dialog" aria-label="Notificaciones">
        <div class="panel-header">
          <strong>Notificaciones</strong>
          <button type="button" class="link" *ngIf="unread > 0" (click)="markAllAsRead()">Marcar todas como leídas</button>
        </div>
        <p class="empty" *ngIf="notifications.length === 0">No tienes notificaciones.</p>
        <ul>
          <li *ngFor="let item of notifications" [class.unread]="!item.read">
            <button type="button" class="item" (click)="openNotification(item)">
              <span class="dot" *ngIf="!item.read" aria-label="Sin leer"></span>
              <span class="content">
                <span class="type">{{ label(item.type) }}</span>
                <span class="message">{{ item.message }}</span>
                <span class="date">{{ formatDate(item.createdAt) }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [
    `
      .bell-wrap { position: relative; }
      .bell { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #d2d2d7; background: #f5f5f7; color: #1d1d1f; cursor: pointer; }
      .badge { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 999px; background: #e11d48; color: #fff; font-size: 0.68rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; }
      .panel { position: absolute; right: 0; top: 44px; width: min(360px, calc(100vw - 32px)); max-height: 70vh; overflow-y: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.15); z-index: 1000; }
      .panel-header { display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1rem; border-bottom: 1px solid #f1f5f9; }
      .link { background: none; border: none; color: #0071e3; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
      .empty { padding: 1rem; color: #64748b; margin: 0; }
      ul { list-style: none; margin: 0; padding: 0; }
      li + li { border-top: 1px solid #f1f5f9; }
      li.unread { background: #f5f9ff; }
      .item { display: flex; gap: 0.6rem; width: 100%; text-align: left; background: none; border: none; padding: 0.8rem 1rem; cursor: pointer; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: #0071e3; margin-top: 0.4rem; flex-shrink: 0; }
      .content { display: flex; flex-direction: column; gap: 0.2rem; }
      .type { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
      .message { font-size: 0.86rem; color: #1d1d1f; }
      .date { font-size: 0.72rem; color: #94a3b8; }
    `,
  ],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: AppNotification[] = [];
  unread = 0;
  open = false;
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly router?: Router) {}

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
    const response = await this.request('/api/notifications');
    if (!response?.ok) return;
    const body = (await response.json()) as { data: AppNotification[]; unread: number };
    this.notifications = body.data ?? [];
    this.unread = body.unread ?? 0;
  }

  /** CA3: abrir una notificación la marca como leída y lleva a la reserva o publicación relacionada. */
  async openNotification(item: AppNotification): Promise<void> {
    if (!item.read) {
      const response = await this.request(`/api/notifications/${encodeURIComponent(item.id)}/read`, 'PATCH');
      if (response?.ok) {
        item.read = true;
        this.unread = Math.max(0, this.unread - 1);
      }
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
      this.notifications.forEach((item) => (item.read = true));
      this.unread = 0;
    }
  }

  routeFor(item: AppNotification): string | null {
    const role = getActiveSession()?.role;
    if (item.entity === 'Booking' && role === 'HUESPED') return `/mis-reservas/${item.entityId}`;
    if (item.entity === 'Booking' && role === 'ANFITRION') return '/anfitrion/publicaciones';
    if (item.entity === 'Listing' && role === 'ANFITRION') return '/anfitrion/mis-publicaciones';
    return null;
  }

  label(type: string): string {
    return NOTIFICATION_LABELS[type] ?? 'Notificación';
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(iso));
  }

  private async request(url: string, method = 'GET'): Promise<Response | null> {
    const session = getActiveSession();
    if (!session) return null;
    try {
      return await fetch(url, { method, headers: { Authorization: `Bearer ${session.token}` } });
    } catch {
      return null;
    }
  }
}
