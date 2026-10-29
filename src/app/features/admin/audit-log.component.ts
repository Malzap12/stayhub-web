import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  AUDIT_PAGE_SIZES,
  AuditEvent,
  AuditEventsPage,
  AuditFilters,
  EMPTY_AUDIT_FILTERS,
  auditActionLabel,
  auditDetailText,
  auditEntityLabel,
  auditQuery,
  auditResultLabel,
} from '../../shared/models/audit.model';

/**
 * HU-054 · Consultar los eventos de auditoría (CA1, CA2 · RF-072, RN-032, RNF-022).
 * El administrador ve quién hizo qué, cuándo y con qué resultado, del más reciente al más antiguo,
 * paginado y con filtros que se combinan.
 */
@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="audit-shell">
      <header class="audit-header">
        <div>
          <span class="eyebrow">Panel de administración</span>
          <h1>Auditoría</h1>
          <p class="subtitle">Quién hizo qué, cuándo y con qué resultado. Los eventos más recientes aparecen primero.</p>
        </div>
        <a routerLink="/admin/moderacion" class="back-link">Ir a Moderación</a>
      </header>

      <form class="filters" (ngSubmit)="applyFilters()" novalidate aria-label="Filtros de la auditoría">
        <label>
          <span>Desde</span>
          <input type="date" name="from" [(ngModel)]="filters.from" />
        </label>
        <label>
          <span>Hasta</span>
          <input type="date" name="to" [min]="filters.from" [(ngModel)]="filters.to" />
        </label>
        <label class="grow">
          <span>Usuario</span>
          <input type="search" name="actor" placeholder="Correo o parte de él" [(ngModel)]="filters.actor" />
        </label>
        <label class="grow">
          <span>Tipo de evento</span>
          <select name="action" [(ngModel)]="filters.action">
            <option value="">Todos</option>
            <option *ngFor="let option of actionOptions" [value]="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label>
          <span>Entidad</span>
          <select name="entity" [(ngModel)]="filters.entity">
            <option value="">Todas</option>
            <option *ngFor="let option of entityOptions" [value]="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label>
          <span>Resultado</span>
          <select name="result" [(ngModel)]="filters.result">
            <option value="">Todos</option>
            <option value="EXITOSO">Exitoso</option>
            <option value="FALLIDO">Fallido</option>
          </select>
        </label>
        <div class="filter-actions">
          <button type="submit" class="btn primary" [disabled]="loading">Aplicar filtros</button>
          <button type="button" class="btn ghost" [disabled]="loading || !hasFilters" (click)="clearFilters()">Limpiar</button>
        </div>
      </form>

      <div class="alert-error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</div>

      <div class="summary" *ngIf="result as r" role="status">
        <span>
          <strong>{{ r.total | number }}</strong> {{ r.total === 1 ? 'evento' : 'eventos' }}
          <ng-container *ngIf="appliedFilters"> con los filtros aplicados</ng-container>
        </span>
        <label class="page-size">
          <span>Mostrar</span>
          <select name="limit" [(ngModel)]="limit" (ngModelChange)="load(1)">
            <option *ngFor="let size of pageSizes" [ngValue]="size">{{ size }}</option>
          </select>
          <span>por página</span>
        </label>
      </div>

      <p class="empty-state" *ngIf="loading && !result" role="status">Cargando eventos…</p>

      <div class="table-card" *ngIf="result as r" [class.busy]="loading">
        <p class="empty-state" *ngIf="r.data.length === 0">No hay eventos que cumplan todos los filtros.</p>
        <table *ngIf="r.data.length > 0">
          <thead>
            <tr>
              <th scope="col">Fecha y hora</th>
              <th scope="col">Usuario</th>
              <th scope="col">Acción</th>
              <th scope="col">Entidad</th>
              <th scope="col">Resultado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let event of r.data; trackBy: trackById" class="audit-row" [attr.data-id]="event.id">
              <td data-label="Fecha y hora" class="when">{{ formatDate(event.occurredAt) }}</td>
              <td data-label="Usuario" class="actor">{{ event.actor === 'anonimo' ? 'Sin sesión' : event.actor }}</td>
              <td data-label="Acción">
                <span class="action">{{ actionLabel(event.action) }}</span>
                <span class="detail" *ngIf="detailText(event)">{{ detailText(event) }}</span>
              </td>
              <td data-label="Entidad">{{ entityLabel(event.entity) }}</td>
              <td data-label="Resultado">
                <span class="badge" [class.failed]="event.result === 'FALLIDO'">{{ resultLabel(event.result) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav class="pager" *ngIf="result && result.totalPages > 1" aria-label="Páginas de la auditoría">
        <button type="button" class="btn ghost" [disabled]="loading || result.page <= 1" (click)="load(result.page - 1)">Anterior</button>
        <span>Página {{ result.page }} de {{ result.totalPages }}</span>
        <button type="button" class="btn ghost" [disabled]="loading || result.page >= result.totalPages" (click)="load(result.page + 1)">
          Siguiente
        </button>
      </nav>
    </section>
  `,
  styles: [`
    .audit-shell { max-width: 1180px; margin: 0 auto; padding: 36px 24px 72px; color: #1d1d1f; }
    .audit-header {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap;
      margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #e5e5ea;
    }
    .eyebrow { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #86868b; }
    h1 { margin: 6px 0 8px; font-size: 2rem; letter-spacing: -0.03em; }
    .subtitle { margin: 0; color: #6e6e73; line-height: 1.5; }
    .back-link { font-size: 0.85rem; font-weight: 600; color: #0071e3; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
    .filters {
      display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px;
      background: #fff; border: 1px solid #e5e5ea; border-radius: 20px; padding: 18px 20px; margin-bottom: 18px;
    }
    .filters label, .page-size {
      display: flex; flex-direction: column; gap: 6px; font-size: 0.72rem; font-weight: 700; color: #6e6e73;
      text-transform: uppercase; letter-spacing: 0.05em; min-width: 0;
    }
    .filters label.grow { flex: 1 1 200px; }
    .filters input, .filters select, .page-size select {
      height: 38px; padding: 0 10px; border-radius: 10px; border: 1px solid #d2d2d7; background: #fff;
      font: inherit; font-size: 0.86rem; color: #1d1d1f; text-transform: none; letter-spacing: normal; font-weight: 500; min-width: 0;
    }
    .filter-actions { display: flex; gap: 8px; }
    .btn {
      height: 38px; border-radius: 980px; padding: 0 16px; font: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer;
      border: 1px solid transparent;
    }
    .btn.primary { background: #1d1d1f; color: #fff; }
    .btn.ghost { background: #fff; color: #1d1d1f; border-color: #d2d2d7; }
    .btn:disabled { opacity: 0.5; cursor: default; }
    .alert-error {
      padding: 13px 16px; margin-bottom: 18px; border-radius: 12px; background: #fef2f2; color: #991b1b;
      border: 1px solid #fecaca; font-size: 0.88rem; font-weight: 600;
    }
    .summary {
      display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
      margin-bottom: 12px; font-size: 0.9rem; color: #3a3a3c;
    }
    .page-size { flex-direction: row; align-items: center; text-transform: none; letter-spacing: normal; font-size: 0.82rem; }
    .page-size select { height: 32px; }
    .empty-state { color: #6e6e73; font-size: 0.9rem; padding: 8px 4px; }
    .table-card { background: #fff; border: 1px solid #e5e5ea; border-radius: 20px; overflow: hidden; transition: opacity 0.15s; }
    .table-card.busy { opacity: 0.55; }
    .table-card .empty-state { padding: 28px 20px; margin: 0; text-align: center; }
    table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
    th {
      text-align: left; padding: 12px 16px; font-size: 0.72rem; font-weight: 700; color: #86868b;
      text-transform: uppercase; letter-spacing: 0.05em; background: #fafafa; border-bottom: 1px solid #e5e5ea;
    }
    td { padding: 13px 16px; border-bottom: 1px solid #f2f2f7; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .when { white-space: nowrap; color: #3a3a3c; }
    .actor { overflow-wrap: anywhere; }
    .action { display: block; font-weight: 600; }
    .detail { display: block; margin-top: 3px; font-size: 0.8rem; color: #6e6e73; line-height: 1.4; overflow-wrap: anywhere; }
    .badge {
      display: inline-block; padding: 3px 10px; border-radius: 980px; font-size: 0.75rem; font-weight: 700;
      background: #dcfce7; color: #166534;
    }
    .badge.failed { background: #fee2e2; color: #991b1b; }
    .pager { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 18px; font-size: 0.86rem; }
    @media (max-width: 720px) {
      .audit-shell { padding: 24px 16px 56px; }
      .filters label, .filters label.grow { flex: 1 1 100%; }
      .filter-actions { flex: 1 1 100%; }
      .filter-actions .btn { flex: 1; }
      thead { display: none; }
      table, tbody, tr, td { display: block; width: 100%; box-sizing: border-box; }
      tr { padding: 10px 0; border-bottom: 1px solid #e5e5ea; }
      tr:last-child { border-bottom: none; }
      td { border: none; padding: 5px 16px; display: grid; grid-template-columns: 110px 1fr; gap: 10px; }
      td::before { content: attr(data-label); font-size: 0.72rem; font-weight: 700; color: #86868b; text-transform: uppercase; }
      .when { white-space: normal; }
    }
  `],
})
export class AuditLogComponent implements OnInit {
  readonly pageSizes = AUDIT_PAGE_SIZES;
  readonly actionOptions = toOptions(AUDIT_ACTION_LABELS);
  readonly entityOptions = toOptions(AUDIT_ENTITY_LABELS);

  /** Filtros que el administrador está editando. */
  filters: AuditFilters = { ...EMPTY_AUDIT_FILTERS };
  /** Filtros con los que se hizo la última consulta; la paginación los conserva. */
  applied: AuditFilters = { ...EMPTY_AUDIT_FILTERS };
  limit = AUDIT_PAGE_SIZES[0];
  result: AuditEventsPage | null = null;
  loading = false;
  errorMessage = '';

  private readonly dateFormatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  ngOnInit(): void {
    void this.load(1);
  }

  get hasFilters(): boolean {
    return Object.values(this.filters).some((value) => value.trim() !== '') || this.appliedFilters;
  }

  get appliedFilters(): boolean {
    return Object.values(this.applied).some((value) => value.trim() !== '');
  }

  /** CA2: consulta con todos los filtros elegidos, desde la primera página. */
  applyFilters(): void {
    const { from, to } = this.filters;
    if (from && to && from > to) {
      this.errorMessage = 'La fecha «Desde» no puede ser posterior a «Hasta».';
      return;
    }
    this.applied = { ...this.filters };
    void this.load(1);
  }

  clearFilters(): void {
    this.filters = { ...EMPTY_AUDIT_FILTERS };
    this.applied = { ...EMPTY_AUDIT_FILTERS };
    void this.load(1);
  }

  /** CA1: trae una página de eventos, del más reciente al más antiguo. */
  async load(page: number): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const token = getActiveSession()?.token;
      const response = await fetch(`/api/audit/events?${auditQuery(this.applied, page, this.limit)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.errorMessage =
          response.status === 401
            ? 'Tu sesión expiró. Inicia sesión de nuevo como administrador.'
            : response.status === 403
              ? 'Solo el administrador puede consultar la auditoría.'
              : [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible cargar la auditoría.';
        return;
      }
      this.result = body as AuditEventsPage;
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  formatDate(iso: string): string {
    return this.dateFormatter.format(new Date(iso));
  }

  actionLabel(action: string): string {
    return auditActionLabel(action);
  }

  entityLabel(entity: string): string {
    return auditEntityLabel(entity);
  }

  resultLabel(result: string): string {
    return auditResultLabel(result);
  }

  detailText(event: AuditEvent): string {
    return auditDetailText(event.detail);
  }

  trackById(_index: number, event: AuditEvent): string {
    return event.id;
  }
}

function toOptions(labels: Record<string, string>): Array<{ value: string; label: string }> {
  return Object.entries(labels)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}
