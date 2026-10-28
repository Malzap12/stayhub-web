import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getActiveSession } from '../../core/guards/auth.guard';
import { HostModerationNotification, Listing, ListingStatus } from '../../shared/models/listing.model';
import { initialsOf } from '../../shared/models/display.model';

/** Publicación tal como la devuelve GET /api/listings/pending. */

/** Usuario tal como lo devuelve GET /api/users para moderación. */
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'HUESPED' | 'ANFITRION' | 'ADMINISTRADOR';
  status: 'ACTIVA' | 'DESACTIVADA' | 'RESTRINGIDA';
  restrictionReason?: string;
  createdAt?: string;
}

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

export const ROLE_LABELS: Record<ApiUser['role'], string> = {
  HUESPED: 'Huésped',
  ANFITRION: 'Anfitrión',
  ADMINISTRADOR: 'Administrador',
};

export const USER_STATUS_LABELS: Record<ApiUser['status'], string> = {
  ACTIVA: 'Activa',
  RESTRINGIDA: 'Restringida',
  DESACTIVADA: 'Desactivada',
};

type ModerationTab = 'solicitudes' | 'publicaciones' | 'usuarios';

interface ReasonDialog {
  kind: 'return' | 'block' | 'restrict';
  title: string;
  subject: string;
  help: string;
  placeholder: string;
  confirm: string;
}

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
          <span class="eyebrow">Panel de administración</span>
          <h1>Moderación</h1>
          <p class="subtitle">Revisa solicitudes, controla las publicaciones y gestiona a los usuarios del marketplace.</p>
        </div>
        <div class="kpis">
          <div class="kpi"><strong>{{ pendingQueue.length }}</strong><span>Solicitudes</span></div>
          <div class="kpi"><strong>{{ countListings('ACTIVA') }}</strong><span>Activas</span></div>
          <div class="kpi"><strong>{{ countListings('BLOQUEADA') }}</strong><span>Bloqueadas</span></div>
          <div class="kpi"><strong>{{ restrictedUsersCount }}</strong><span>Usuarios restringidos</span></div>
        </div>
      </header>

      <div class="toast" *ngIf="feedbackMessage" role="status">
        <span>{{ feedbackMessage }}</span>
        <button type="button" class="toast-close" (click)="feedbackMessage = ''" aria-label="Cerrar aviso">×</button>
      </div>

      <div class="alert-error" *ngIf="errorMessage" role="alert">
        {{ errorMessage }}
        <button type="button" class="btn ghost small" (click)="load()">Reintentar</button>
      </div>

      <nav class="tabs" role="tablist" aria-label="Secciones de moderación">
        <button type="button" role="tab" [class.active]="activeTab === 'solicitudes'" [attr.aria-selected]="activeTab === 'solicitudes'" (click)="activeTab = 'solicitudes'">
          Solicitudes <span class="count">{{ pendingQueue.length }}</span>
        </button>
        <button type="button" role="tab" [class.active]="activeTab === 'publicaciones'" [attr.aria-selected]="activeTab === 'publicaciones'" (click)="activeTab = 'publicaciones'">
          Publicaciones <span class="count">{{ allListings.length }}</span>
        </button>
        <button type="button" role="tab" [class.active]="activeTab === 'usuarios'" [attr.aria-selected]="activeTab === 'usuarios'" (click)="activeTab = 'usuarios'">
          Usuarios <span class="count">{{ allUsers.length }}</span>
        </button>
      </nav>

      <!-- Solicitudes de activación, de la más antigua a la más reciente -->
      <section class="panel" *ngIf="activeTab === 'solicitudes'" aria-label="Solicitudes de publicación pendientes">
        <div class="panel-head">
          <div>
            <h2>Solicitudes pendientes</h2>
            <p>Las más antiguas aparecen primero. Aprueba las que cumplen los estándares o devuélvelas con un motivo.</p>
          </div>
        </div>

        <p class="empty-state" *ngIf="loading" role="status">Cargando solicitudes…</p>
        <div class="empty-state" *ngIf="!loading && pendingQueue.length === 0">
          <strong>Todo al día</strong>
          <span>No hay publicaciones esperando revisión.</span>
        </div>

        <div class="request-grid" *ngIf="!loading && pendingQueue.length > 0">
          <article class="request-card" *ngFor="let item of pendingQueue">
            <div class="request-media">
              <img *ngIf="item.imageUrl; else noPhoto" [src]="item.imageUrl" [alt]="item.title" loading="lazy" />
              <ng-template #noPhoto><div class="no-photo">Sin foto</div></ng-template>
            </div>
            <div class="request-body">
              <span class="since">Solicitada el {{ item.requestedAt | date: 'd MMM y, h:mm a' }}</span>
              <h3>{{ item.title }}</h3>
              <p class="meta">{{ item.city || 'Sin ciudad' }} · {{ item.hostName }} · {{ item.capacity }} huéspedes</p>
              <p class="desc">{{ item.description }}</p>
              <div class="row-actions">
                <button type="button" class="btn primary" [disabled]="busyId === item.id" (click)="approveListing(item.id)">Aprobar</button>
                <button type="button" class="btn ghost" (click)="openReturnPrompt(item.id)">Devolver con motivo</button>
              </div>
            </div>
          </article>
        </div>

        <div class="session-log" *ngIf="notifications.length > 0">
          <h3>Decisiones de esta sesión</h3>
          <ul>
            <li *ngFor="let n of notifications">
              <span class="badge" [attr.data-tone]="n.type">{{ decisionLabel(n.type) }}</span>
              <span><strong>{{ n.listingTitle }}</strong> · {{ n.hostName }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Todas las publicaciones: bloquear las engañosas -->
      <section class="panel" *ngIf="activeTab === 'publicaciones'" aria-label="Bloquear publicaciones">
        <div class="panel-head">
          <div>
            <h2>Publicaciones</h2>
            <p>Bloquea una publicación engañosa: deja de aparecer en las búsquedas, sus reservas futuras quedan en revisión y se avisa al anfitrión y a los huéspedes.</p>
          </div>
        </div>

        <div class="toolbar">
          <input class="search" type="search" [(ngModel)]="blockFilter" placeholder="Buscar por título, ciudad o anfitrión" aria-label="Buscar publicación" />
          <div class="chips" role="group" aria-label="Filtrar por estado">
            <button type="button" class="chip" [class.active]="listingStatusFilter === ''" (click)="listingStatusFilter = ''">Todas</button>
            <button type="button" class="chip" *ngFor="let status of listingStatuses" [class.active]="listingStatusFilter === status" (click)="listingStatusFilter = status">
              {{ statusLabel(status) }}
            </button>
          </div>
        </div>

        <div class="empty-state" *ngIf="!loading && visibleListings.length === 0"><span>No hay publicaciones que coincidan.</span></div>

        <div class="table" *ngIf="visibleListings.length > 0" role="table">
          <div class="table-head" role="row">
            <span role="columnheader">Publicación</span>
            <span role="columnheader">Anfitrión</span>
            <span role="columnheader">Estado</span>
            <span role="columnheader" class="right">Acción</span>
          </div>
          <div class="table-row block-item" role="row" *ngFor="let item of visibleListings.slice(0, listingLimit)" [attr.data-id]="item.id">
            <div class="cell main" role="cell">
              <img class="thumb" *ngIf="item.images?.length; else thumbless" [src]="item.images![0]" alt="" loading="lazy" />
              <ng-template #thumbless><span class="thumb placeholder" aria-hidden="true"></span></ng-template>
              <div>
                <strong>{{ item.title }}</strong>
                <span class="muted">{{ item.city || 'Sin ciudad' }}</span>
                <span class="reason" *ngIf="item.status === 'BLOQUEADA' && item.blockReason">Motivo: {{ item.blockReason }}</span>
              </div>
            </div>
            <div class="cell" role="cell"><span class="muted">{{ item.hostName || 'Anfitrión' }}</span></div>
            <div class="cell" role="cell"><span class="badge" [attr.data-status]="item.status">{{ statusLabel(item.status) }}</span></div>
            <div class="cell right" role="cell">
              <button type="button" class="btn danger small btn-block" *ngIf="item.status !== 'BLOQUEADA'" (click)="openBlockPrompt(item.id)">Bloquear</button>
              <span class="muted small" *ngIf="item.status === 'BLOQUEADA'">Bloqueada</span>
            </div>
          </div>
        </div>
        <button type="button" class="btn ghost more" *ngIf="visibleListings.length > listingLimit" (click)="listingLimit = listingLimit + pageSize">
          Mostrar más ({{ visibleListings.length - listingLimit }} restantes)
        </button>
      </section>

      <!-- Usuarios: restringir y levantar la restricción -->
      <section class="panel" *ngIf="activeTab === 'usuarios'" aria-label="Gestión de usuarios y restricciones">
        <div class="panel-head">
          <div>
            <h2>Usuarios</h2>
            <p>Restringir cierra las sesiones del usuario y le impide entrar. Si es anfitrión, sus publicaciones activas se pausan y sus reservas futuras quedan en revisión.</p>
          </div>
        </div>

        <div class="toolbar">
          <input class="search" type="search" [(ngModel)]="userFilter" placeholder="Buscar por nombre o correo" aria-label="Buscar usuario" />
          <div class="chips" role="group" aria-label="Filtrar por rol">
            <button type="button" class="chip" [class.active]="userRoleFilter === ''" (click)="userRoleFilter = ''">Todos</button>
            <button type="button" class="chip" [class.active]="userRoleFilter === 'HUESPED'" (click)="userRoleFilter = 'HUESPED'">Huéspedes</button>
            <button type="button" class="chip" [class.active]="userRoleFilter === 'ANFITRION'" (click)="userRoleFilter = 'ANFITRION'">Anfitriones</button>
            <button type="button" class="chip" [class.active]="userRoleFilter === 'RESTRINGIDA'" (click)="userRoleFilter = 'RESTRINGIDA'">Restringidos</button>
          </div>
        </div>

        <div class="empty-state" *ngIf="!loading && visibleUsers.length === 0"><span>No hay usuarios que coincidan.</span></div>

        <div class="table users" *ngIf="visibleUsers.length > 0" role="table">
          <div class="table-head" role="row">
            <span role="columnheader">Usuario</span>
            <span role="columnheader">Rol</span>
            <span role="columnheader">Estado</span>
            <span role="columnheader" class="right">Acción</span>
          </div>
          <div class="table-row user-item" role="row" *ngFor="let u of visibleUsers.slice(0, userLimit)">
            <div class="cell main" role="cell">
              <span class="avatar" aria-hidden="true">{{ initials(u.name) }}</span>
              <div>
                <strong>{{ u.name }}</strong>
                <span class="muted">{{ u.email }}</span>
                <span class="reason" *ngIf="u.status === 'RESTRINGIDA' && u.restrictionReason">Motivo: {{ u.restrictionReason }}</span>
              </div>
            </div>
            <div class="cell" role="cell"><span class="muted">{{ roleLabel(u.role) }}</span></div>
            <div class="cell" role="cell"><span class="badge" [attr.data-status]="u.status">{{ userStatusLabel(u.status) }}</span></div>
            <div class="cell right" role="cell">
              <ng-container *ngIf="u.role !== 'ADMINISTRADOR'; else adminLabel">
                <button type="button" class="btn danger small btn-restrict" *ngIf="u.status !== 'RESTRINGIDA'" (click)="openRestrictPrompt(u.id)">Restringir</button>
                <button type="button" class="btn ghost small btn-unrestrict" *ngIf="u.status === 'RESTRINGIDA'" [disabled]="busyId === u.id" (click)="confirmUnrestrict(u.id)">
                  Levantar restricción
                </button>
              </ng-container>
              <ng-template #adminLabel><span class="muted small">—</span></ng-template>
            </div>
          </div>
        </div>
        <button type="button" class="btn ghost more" *ngIf="visibleUsers.length > userLimit" (click)="userLimit = userLimit + pageSize">
          Mostrar más ({{ visibleUsers.length - userLimit }} restantes)
        </button>
      </section>

      <!-- Diálogo para indicar el motivo de devolver, bloquear o restringir -->
      <div class="dialog-backdrop" *ngIf="dialog as d" (click)="closeDialog()">
        <div class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="d.title" (click)="$event.stopPropagation()">
          <h2>{{ d.title }}</h2>
          <p class="dialog-subject">{{ d.subject }}</p>
          <p class="dialog-help">{{ d.help }}</p>
          <label for="dialog-reason">Motivo (obligatorio)</label>
          <textarea
            id="dialog-reason"
            rows="4"
            [placeholder]="d.placeholder"
            [ngModel]="dialogReason"
            (ngModelChange)="setDialogReason($event)"
          ></textarea>
          <p class="error-msg" *ngIf="dialogError">{{ dialogError }}</p>
          <div class="dialog-actions">
            <button type="button" class="btn ghost" (click)="closeDialog()">Cancelar</button>
            <button type="button" class="btn" [class.danger]="d.kind !== 'return'" [class.primary]="d.kind === 'return'" [disabled]="busyId !== null" (click)="confirmDialog()">
              {{ busyId !== null ? 'Guardando…' : d.confirm }}
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .moderation-shell { max-width: 1180px; margin: 0 auto; padding: 36px 24px 72px; color: #1d1d1f; }
    .moderation-header {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; flex-wrap: wrap; margin-bottom: 24px;
    }
    .eyebrow { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #86868b; }
    h1 { margin: 6px 0 6px; font-size: 2rem; letter-spacing: -0.03em; }
    .subtitle { margin: 0; color: #6e6e73; line-height: 1.5; max-width: 560px; }
    .kpis { display: grid; grid-template-columns: repeat(4, minmax(96px, 1fr)); gap: 10px; }
    .kpi {
      background: #fff; border: 1px solid #e5e5ea; border-radius: 16px; padding: 12px 14px;
      display: flex; flex-direction: column; gap: 2px; min-width: 0;
    }
    .kpi strong { font-size: 1.4rem; letter-spacing: -0.02em; }
    .kpi span { font-size: 0.74rem; color: #6e6e73; font-weight: 600; }
    .toast {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 14px 18px;
      border-radius: 14px; background: #1d1d1f; color: #fff; font-size: 0.88rem; line-height: 1.45; margin-bottom: 18px;
    }
    .toast-close { background: transparent; border: none; color: #fff; font-size: 1.2rem; line-height: 1; cursor: pointer; padding: 0 4px; }
    .alert-error {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 13px 16px;
      margin-bottom: 18px; border-radius: 12px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;
      font-size: 0.88rem; font-weight: 600;
    }
    .tabs { display: flex; gap: 6px; border-bottom: 1px solid #e5e5ea; margin-bottom: 20px; overflow-x: auto; }
    .tabs button {
      display: inline-flex; align-items: center; gap: 8px; padding: 12px 16px; background: transparent; border: none;
      border-bottom: 2px solid transparent; font: inherit; font-size: 0.92rem; font-weight: 600; color: #6e6e73; cursor: pointer;
      white-space: nowrap; margin-bottom: -1px;
    }
    .tabs button.active { color: #1d1d1f; border-bottom-color: #1d1d1f; }
    .tabs .count { padding: 1px 8px; border-radius: 980px; background: #f2f2f7; font-size: 0.74rem; color: #3a3a3c; }
    .tabs button.active .count { background: #1d1d1f; color: #fff; }
    .panel { background: #fff; border: 1px solid #e5e5ea; border-radius: 22px; padding: 24px; }
    .panel-head { margin-bottom: 18px; }
    .panel-head h2 { margin: 0 0 4px; font-size: 1.25rem; letter-spacing: -0.02em; }
    .panel-head p { margin: 0; color: #6e6e73; font-size: 0.88rem; line-height: 1.5; max-width: 760px; }
    .empty-state {
      display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 36px 16px; text-align: center;
      color: #6e6e73; font-size: 0.9rem; border: 1px dashed #d2d2d7; border-radius: 16px;
    }
    .empty-state strong { color: #1d1d1f; font-size: 1rem; }
    .request-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 16px; }
    .request-card { border: 1px solid #e5e5ea; border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; }
    .request-media { aspect-ratio: 16 / 9; background: #f2f2f7; }
    .request-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .no-photo { width: 100%; height: 100%; display: grid; place-items: center; color: #86868b; font-size: 0.82rem; }
    .request-body { padding: 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .since { font-size: 0.74rem; color: #86868b; font-weight: 600; }
    .request-body h3 { margin: 0; font-size: 1.02rem; }
    .meta { margin: 0; font-size: 0.82rem; color: #6e6e73; }
    .desc { margin: 0; font-size: 0.86rem; color: #3a3a3c; line-height: 1.45; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .row-actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    .btn {
      border-radius: 980px; padding: 9px 16px; font: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer;
      border: 1px solid #d2d2d7; background: #fff; color: #1d1d1f; white-space: nowrap;
    }
    .btn.small { padding: 6px 12px; font-size: 0.78rem; }
    .btn.primary { background: #1d1d1f; border-color: #1d1d1f; color: #fff; }
    .btn.danger { background: #fff; border-color: #fecaca; color: #b91c1c; }
    .btn.danger:hover { background: #fef2f2; }
    .dialog-actions .btn.danger { background: #b91c1c; border-color: #b91c1c; color: #fff; }
    .btn:disabled { opacity: 0.55; cursor: default; }
    .btn.more { display: block; margin: 16px auto 0; }
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 14px; }
    .search {
      flex: 1 1 260px; min-width: 0; height: 40px; padding: 0 14px; border-radius: 980px; border: 1px solid #d2d2d7;
      font: inherit; font-size: 0.88rem; background: #fff;
    }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      padding: 7px 12px; border-radius: 980px; border: 1px solid #e5e5ea; background: #fff; font: inherit;
      font-size: 0.78rem; font-weight: 600; color: #3a3a3c; cursor: pointer;
    }
    .chip.active { background: #1d1d1f; border-color: #1d1d1f; color: #fff; }
    .table { border: 1px solid #e5e5ea; border-radius: 16px; overflow: hidden; }
    .table-head, .table-row {
      display: grid; grid-template-columns: minmax(0, 2.4fr) minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 1fr); gap: 12px;
      align-items: center; padding: 12px 16px;
    }
    .table-head { background: #f9f9fb; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #86868b; }
    .table-row { border-top: 1px solid #f0f0f2; font-size: 0.86rem; }
    .table-row:hover { background: #fcfcfd; }
    .cell { min-width: 0; }
    .cell.main { display: flex; align-items: center; gap: 12px; }
    .cell.main > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .cell.main strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .right { text-align: right; justify-self: end; }
    .muted { color: #6e6e73; overflow: hidden; text-overflow: ellipsis; }
    .small { font-size: 0.78rem; }
    .reason { font-size: 0.76rem; color: #991b1b; }
    .thumb { width: 52px; height: 40px; border-radius: 10px; object-fit: cover; flex-shrink: 0; background: #f2f2f7; display: block; }
    .thumb.placeholder { display: inline-block; }
    .avatar {
      width: 36px; height: 36px; border-radius: 50%; background: #1d1d1f; color: #fff; display: grid; place-items: center;
      font-size: 0.78rem; font-weight: 700; flex-shrink: 0;
    }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 980px; font-size: 0.74rem; font-weight: 700; background: #f2f2f7; color: #3a3a3c; white-space: nowrap; }
    .badge[data-status='ACTIVA'] { background: #e8f8ee; color: #166534; }
    .badge[data-status='PENDIENTE_REVISION'] { background: #fff4e5; color: #9a5b00; }
    .badge[data-status='PAUSADA'], .badge[data-status='DESACTIVADA'] { background: #f2f2f7; color: #6e6e73; }
    .badge[data-status='BLOQUEADA'], .badge[data-status='RESTRINGIDA'] { background: #fef2f2; color: #991b1b; }
    .badge[data-tone='APROBADA'] { background: #e8f8ee; color: #166534; }
    .badge[data-tone='DEVUELTA'] { background: #fff4e5; color: #9a5b00; }
    .badge[data-tone='BLOQUEADA'] { background: #fef2f2; color: #991b1b; }
    .session-log { margin-top: 22px; padding-top: 18px; border-top: 1px solid #f0f0f2; }
    .session-log h3 { margin: 0 0 10px; font-size: 0.95rem; }
    .session-log ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.86rem; }
    .session-log li { display: flex; align-items: center; gap: 10px; }
    .dialog-backdrop {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.42); display: grid; place-items: center; padding: 16px; z-index: 1000;
    }
    .dialog {
      width: min(520px, 100%); background: #fff; border-radius: 22px; padding: 24px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
      display: flex; flex-direction: column; gap: 8px;
    }
    .dialog h2 { margin: 0; font-size: 1.2rem; }
    .dialog-subject { margin: 0; font-weight: 700; }
    .dialog-help { margin: 0 0 6px; color: #6e6e73; font-size: 0.86rem; line-height: 1.45; }
    .dialog label { font-size: 0.78rem; font-weight: 700; color: #3a3a3c; }
    .dialog textarea { width: 100%; box-sizing: border-box; border-radius: 12px; border: 1px solid #d2d2d7; padding: 10px 12px; font: inherit; font-size: 0.88rem; resize: vertical; }
    .error-msg { margin: 0; color: #b91c1c; font-size: 0.8rem; font-weight: 600; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
    @media (max-width: 760px) {
      .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
      .panel { padding: 16px; }
      .table-head { display: none; }
      .table-row { grid-template-columns: 1fr auto; row-gap: 8px; }
      .table-row .cell.main { grid-column: 1 / -1; }
      .table-row .cell:nth-child(2) { display: none; }
    }
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
  /** HU-053: usuarios registrados para restringir o levantar restricción. */
  allUsers: ApiUser[] = [];
  userFilter = '';
  restrictingUserId: string | null = null;
  restrictReasonInput = '';
  restrictError = '';

  blockFilter = '';
  blockingListingId: string | null = null;
  blockReasonInput = '';
  blockError = '';

  activeTab: ModerationTab = 'solicitudes';
  listingStatusFilter: ListingStatus | '' = '';
  userRoleFilter: 'HUESPED' | 'ANFITRION' | 'RESTRINGIDA' | '' = '';
  readonly pageSize = 10;
  listingLimit = 10;
  userLimit = 10;
  readonly listingStatuses: ListingStatus[] = ['ACTIVA', 'PENDIENTE_REVISION', 'PAUSADA', 'BORRADOR', 'BLOQUEADA'];

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

  countListings(status: ListingStatus): number {
    return this.allListings.filter((item) => item.status === status).length;
  }

  /** Publicaciones de la pestaña: búsqueda por texto y filtro por estado. */
  get visibleListings(): ApiPendingListing[] {
    return this.filteredAllListings.filter((item) => !this.listingStatusFilter || item.status === this.listingStatusFilter);
  }

  /** Usuarios de la pestaña: búsqueda por texto y filtro por rol o restringidos. */
  get visibleUsers(): ApiUser[] {
    const filter = this.userRoleFilter;
    return this.filteredUsers.filter((u) => !filter || (filter === 'RESTRINGIDA' ? u.status === 'RESTRINGIDA' : u.role === filter));
  }

  roleLabel(role: ApiUser['role']): string {
    return ROLE_LABELS[role] ?? role;
  }

  userStatusLabel(status: ApiUser['status']): string {
    return USER_STATUS_LABELS[status] ?? status;
  }

  initials(name: string): string {
    return initialsOf(name);
  }

  decisionLabel(type: HostModerationNotification['type']): string {
    return { APROBADA: 'Aprobada', DEVUELTA: 'Devuelta', BLOQUEADA: 'Bloqueada' }[type] ?? type;
  }

  /** Diálogo del motivo para devolver, bloquear o restringir, según la acción abierta. */
  get dialog(): ReasonDialog | null {
    if (this.returningListingId) {
      return {
        kind: 'return',
        title: 'Devolver al anfitrión',
        subject: this.listings.find((item) => item.id === this.returningListingId)?.title ?? '',
        help: 'La publicación vuelve a borrador y el anfitrión verá este motivo en Mis publicaciones.',
        placeholder: 'Ej. Las fotografías están oscuras y faltan las reglas de la casa.',
        confirm: 'Devolver',
      };
    }
    if (this.blockingListingId) {
      return {
        kind: 'block',
        title: 'Bloquear publicación',
        subject: this.allListings.find((item) => item.id === this.blockingListingId)?.title ?? '',
        help: 'Dejará de aparecer en las búsquedas, sus reservas futuras quedarán en revisión y se avisará al anfitrión y a los huéspedes.',
        placeholder: 'Ej. Las fotografías no corresponden al inmueble.',
        confirm: 'Bloquear',
      };
    }
    if (this.restrictingUserId) {
      return {
        kind: 'restrict',
        title: 'Restringir usuario',
        subject: this.allUsers.find((u) => u.id === this.restrictingUserId)?.name ?? '',
        help: 'Se cerrarán sus sesiones y no podrá volver a entrar. Si es anfitrión, sus publicaciones activas se pausarán.',
        placeholder: 'Ej. Incumplimiento reiterado de las normas de convivencia.',
        confirm: 'Restringir',
      };
    }
    return null;
  }

  get dialogReason(): string {
    if (this.returningListingId) return this.returnReasonInput;
    if (this.blockingListingId) return this.blockReasonInput;
    return this.restrictReasonInput;
  }

  setDialogReason(value: string): void {
    if (this.returningListingId) this.returnReasonInput = value;
    else if (this.blockingListingId) this.blockReasonInput = value;
    else this.restrictReasonInput = value;
  }

  get dialogError(): string {
    if (this.returningListingId) return this.returnError;
    if (this.blockingListingId) return this.blockError;
    return this.restrictError;
  }

  closeDialog(): void {
    if (this.busyId) return;
    this.cancelReturn();
    this.cancelBlock();
    this.cancelRestrict();
  }

  async confirmDialog(): Promise<void> {
    if (this.returningListingId) await this.confirmReturn(this.returningListingId);
    else if (this.blockingListingId) await this.confirmBlock(this.blockingListingId);
    else if (this.restrictingUserId) await this.confirmRestrict(this.restrictingUserId);
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
      await this.loadUsers();
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

  
  /** HU-053: carga todos los usuarios para la sección de restricciones. */
  async loadUsers(): Promise<void> {
    const response = await fetch('/api/users', { headers: this.authHeaders() });
    if (response.ok) {
      this.allUsers = (await response.json()) as ApiUser[];
    }
  }

  get filteredUsers(): ApiUser[] {
    const term = this.userFilter.trim().toLowerCase();
    if (!term) return this.allUsers;
    return this.allUsers.filter((u) =>
      [u.name, u.email, u.role, u.status].some((v) => v?.toLowerCase().includes(term)),
    );
  }

  get restrictedUsersCount(): number {
    return this.allUsers.filter((u) => u.status === 'RESTRINGIDA').length;
  }

  openRestrictPrompt(id: string): void {
    this.restrictingUserId = id;
    this.restrictReasonInput = '';
    this.restrictError = '';
  }

  cancelRestrict(): void {
    this.restrictingUserId = null;
    this.restrictReasonInput = '';
    this.restrictError = '';
  }

  /**
   * HU-053 CA1 y CA2: restringe al usuario indicando el motivo.
   * Invalida sus sesiones, pasa publicaciones activas a PAUSADA y reservas futuras a EN_REVISION.
   */
  async confirmRestrict(id: string): Promise<void> {
    const reason = this.restrictReasonInput.trim();
    if (reason.length < 5) {
      this.restrictError = 'Indica el motivo de la restricción (al menos 5 caracteres).';
      return;
    }
    const user = this.allUsers.find((u) => u.id === id);
    if (!user) return;

    this.busyId = id;
    this.restrictError = '';
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(id)}/restrict`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ reason }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.restrictError = this.apiError(response.status, body, 'No fue posible restringir al usuario.');
        return;
      }
      user.status = 'RESTRINGIDA';
      user.restrictionReason = reason;

      const affectedListings = (body as { pausedListings?: string[] })?.pausedListings ?? [];
      const affectedBookings = (body as { bookingsUnderReview?: string[] })?.bookingsUnderReview ?? [];

      this.feedbackMessage =
        `"${user.name}" quedó restringido: se cerraron sus sesiones y ya no puede iniciar sesión.` +
        (affectedListings.length > 0 ? ` ${affectedListings.length} publicación(es) quedaron pausadas.` : '') +
        (affectedBookings.length > 0 ? ` ${affectedBookings.length} reserva(s) quedaron en revisión.` : '');

      this.cancelRestrict();
      await this.loadAll();
    } catch {
      this.restrictError = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.busyId = null;
    }
  }

  /**
   * HU-053 CA3: levanta la restricción al usuario para que pueda volver a iniciar sesión.
   * Sus publicaciones continúan PAUSADAS hasta que las reactive.
   */
  async confirmUnrestrict(id: string): Promise<void> {
    const user = this.allUsers.find((u) => u.id === id);
    if (!user) return;

    this.busyId = id;
    this.errorMessage = '';
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(id)}/unrestrict`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.errorMessage = this.apiError(response.status, body, 'No fue posible levantar la restricción.');
        return;
      }
      user.status = 'ACTIVA';
      user.restrictionReason = undefined;

      this.feedbackMessage = `Restricción levantada para "${user.name}". Ya puede iniciar sesión; sus publicaciones siguen pausadas hasta que las reactive.`;
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.busyId = null;
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
        `"${item.title}" quedó bloqueada y ya no aparece en las búsquedas. Se notificó al anfitrión.` +
        (affected.length > 0
          ? ` ${affected.length} reserva(s) futura(s) quedaron en revisión (${affected.join(', ')}) y se avisó a sus huéspedes.`
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
    this.feedbackMessage = `"${item.title}" fue aprobada y ya aparece en las búsquedas. Se notificó al anfitrión.`;
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
    this.feedbackMessage = `"${item.title}" se devolvió al anfitrión. Verá tu motivo en Mis publicaciones.`;
    this.cancelReturn();
  }
}
