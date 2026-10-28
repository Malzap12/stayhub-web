import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getActiveSession } from '../../core/guards/auth.guard';

/** HU-056 · Respuesta de GET /api/reports/dashboard. */
export interface Dashboard {
  generatedAt: string;
  usersByRole: { HUESPED: number; ANFITRION: number; ADMINISTRADOR: number; total: number };
  activeListings: number;
  bookingsByStatus: { PENDIENTE: number; CONFIRMADA: number; CANCELADA: number; COMPLETADA: number; EN_REVISION: number; total: number };
  estimatedRevenue: { currency: string; grossBookingValue: number; platformFees: number; bookings: number };
  topCities: Array<{ city: string; bookings: number; grossBookingValue: number }>;
}

export interface Bar {
  label: string;
  value: number;
  /** Ancho de la barra en %, relativo al mayor valor. */
  width: number;
  tone?: string;
}

export const ROLE_LABELS: Record<string, string> = { HUESPED: 'Huéspedes', ANFITRION: 'Anfitriones', ADMINISTRADOR: 'Administradores' };
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  CONFIRMADA: 'Confirmadas',
  COMPLETADA: 'Completadas',
  PENDIENTE: 'Pendientes de pago',
  EN_REVISION: 'En revisión',
  CANCELADA: 'Canceladas',
};

/** HU-058 · Reportes de gestión exportables a Excel (AMB-23). */
export const EXPORT_REPORTS = [
  { value: 'usuarios', label: 'Usuarios', statuses: ['ACTIVA', 'RESTRINGIDA', 'DESACTIVADA'] },
  { value: 'publicaciones', label: 'Publicaciones', statuses: ['BORRADOR', 'PENDIENTE_REVISION', 'ACTIVA', 'PAUSADA', 'BLOQUEADA'] },
  { value: 'reservas', label: 'Reservas', statuses: ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'EN_REVISION', 'CANCELADA'] },
  { value: 'ingresos', label: 'Ingresos estimados', statuses: [] as string[] },
  { value: 'demanda', label: 'Demanda por ciudad y tipo', statuses: [] as string[] },
];

export interface ExportFilters {
  report: string;
  from: string;
  to: string;
  city: string;
  status: string;
}

/** Nombre del archivo que indica el API en Content-Disposition. */
export function fileNameFrom(disposition: string | null, fallback: string): string {
  return /filename="?([^";]+)"?/.exec(disposition ?? '')?.[1] ?? fallback;
}

/** Barras proporcionales al mayor valor (el mayor ocupa el 100 %). */
export function toBars(entries: Array<[string, number, string?]>): Bar[] {
  const max = Math.max(0, ...entries.map(([, value]) => value));
  return entries.map(([label, value, tone]) => ({ label, value, width: max > 0 ? Math.round((value / max) * 100) : 0, tone }));
}

/**
 * HU-056 · Ver los indicadores del negocio (CA1, CA3 · RF-074, RN-026).
 * CA1: usuarios por rol, publicaciones ACTIVAS, reservas por estado, ingresos estimados y las 5 ciudades con más
 * reservas confirmadas y completadas. CA3: la ruta solo la abre el administrador y el API responde 403 a otros roles.
 */
@Component({
  selector: 'app-business-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="dash-shell">
      <header class="dash-header">
        <div>
          <span class="eyebrow">Panel de Administración</span>
          <h1>Indicadores del negocio</h1>
          <p class="subtitle">Estado actual del marketplace, calculado con los datos guardados en la plataforma.</p>
        </div>
        <div class="header-actions">
          <span class="updated" *ngIf="dashboard">Actualizado: {{ dashboard.generatedAt | date: 'yyyy-MM-dd HH:mm' }}</span>
          <button type="button" class="refresh-btn" [disabled]="loading" (click)="load()">
            {{ loading ? 'Actualizando…' : 'Actualizar' }}
          </button>
        </div>
      </header>

      <div class="alert-error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</div>
      <p class="empty-state" *ngIf="loading && !dashboard" role="status">Cargando indicadores…</p>

      <ng-container *ngIf="dashboard as d">
        <div class="kpi-grid">
          <article class="kpi" data-kpi="users">
            <span class="kpi-label">Usuarios registrados</span>
            <strong class="kpi-value">{{ d.usersByRole.total | number }}</strong>
            <span class="kpi-hint">{{ d.usersByRole.HUESPED | number }} huéspedes · {{ d.usersByRole.ANFITRION | number }} anfitriones</span>
          </article>
          <article class="kpi" data-kpi="listings">
            <span class="kpi-label">Publicaciones activas</span>
            <strong class="kpi-value">{{ d.activeListings | number }}</strong>
            <span class="kpi-hint">Visibles hoy en las búsquedas</span>
          </article>
          <article class="kpi" data-kpi="bookings">
            <span class="kpi-label">Reservas</span>
            <strong class="kpi-value">{{ d.bookingsByStatus.total | number }}</strong>
            <span class="kpi-hint">{{ d.bookingsByStatus.CONFIRMADA + d.bookingsByStatus.COMPLETADA | number }} confirmadas o completadas</span>
          </article>
          <article class="kpi accent" data-kpi="revenue">
            <span class="kpi-label">Ingresos estimados</span>
            <strong class="kpi-value">{{ cop(d.estimatedRevenue.grossBookingValue) }}</strong>
            <span class="kpi-hint">Comisión de la plataforma: {{ cop(d.estimatedRevenue.platformFees) }}</span>
          </article>
        </div>

        <div class="panel-grid">
          <section class="panel" aria-label="Usuarios por rol">
            <h2>Usuarios por rol</h2>
            <ul class="bars">
              <li *ngFor="let bar of roleBars" [attr.data-label]="bar.label">
                <span class="bar-label">{{ bar.label }}</span>
                <span class="bar-track"><span class="bar-fill" [style.width.%]="bar.width"></span></span>
                <span class="bar-value">{{ bar.value | number }}</span>
              </li>
            </ul>
          </section>

          <section class="panel" aria-label="Reservas por estado">
            <h2>Reservas por estado</h2>
            <ul class="bars">
              <li *ngFor="let bar of statusBars" [attr.data-label]="bar.label">
                <span class="bar-label">{{ bar.label }}</span>
                <span class="bar-track"><span class="bar-fill" [attr.data-tone]="bar.tone" [style.width.%]="bar.width"></span></span>
                <span class="bar-value">{{ bar.value | number }}</span>
              </li>
            </ul>
          </section>

          <section class="panel" aria-label="Ciudades con más reservas">
            <h2>Top 5 ciudades</h2>
            <p class="panel-hint">Por reservas confirmadas y completadas.</p>
            <p class="empty-inline" *ngIf="d.topCities.length === 0">Todavía no hay reservas confirmadas ni completadas.</p>
            <ol class="cities" *ngIf="d.topCities.length > 0">
              <li *ngFor="let city of d.topCities; let i = index">
                <span class="rank">{{ i + 1 }}</span>
                <span class="city-name">{{ city.city }}</span>
                <span class="city-meta">{{ city.bookings | number }} reserva(s) · {{ cop(city.grossBookingValue) }}</span>
              </li>
            </ol>
          </section>

          <section class="panel" aria-label="Ingresos estimados">
            <h2>Ingresos estimados</h2>
            <dl class="revenue">
              <div><dt>Valor de las reservas</dt><dd>{{ cop(d.estimatedRevenue.grossBookingValue) }}</dd></div>
              <div><dt>Comisión de la plataforma</dt><dd>{{ cop(d.estimatedRevenue.platformFees) }}</dd></div>
              <div><dt>Reservas que suman</dt><dd>{{ d.estimatedRevenue.bookings | number }}</dd></div>
            </dl>
            <p class="panel-hint">
              Suma de las reservas confirmadas y completadas en {{ d.estimatedRevenue.currency }}. La comisión es la tarifa de
              servicio que cobra la plataforma.
            </p>
          </section>
        </div>
      </ng-container>

      <!-- HU-058 · Exportar reportes a Excel -->
      <section class="panel export-panel" aria-label="Exportar reportes a Excel">
        <h2>Exportar a Excel</h2>
        <p class="panel-hint">
          Descarga un archivo .xlsx con encabezados, los filtros aplicados, la fecha de generación y una fila de totales.
        </p>
        <form class="export-form" (ngSubmit)="exportReport()" novalidate>
          <label>
            <span>Reporte</span>
            <select name="report" [(ngModel)]="exportFilters.report" (ngModelChange)="exportFilters.status = ''">
              <option *ngFor="let report of exportReports" [value]="report.value">{{ report.label }}</option>
            </select>
          </label>
          <label>
            <span>Desde</span>
            <input type="date" name="from" [(ngModel)]="exportFilters.from" />
          </label>
          <label>
            <span>Hasta</span>
            <input type="date" name="to" [min]="exportFilters.from" [(ngModel)]="exportFilters.to" />
          </label>
          <label *ngIf="exportFilters.report !== 'usuarios'">
            <span>Ciudad</span>
            <input type="text" name="city" placeholder="Todas" [(ngModel)]="exportFilters.city" />
          </label>
          <label *ngIf="statusOptions.length > 0">
            <span>Estado</span>
            <select name="status" [(ngModel)]="exportFilters.status">
              <option value="">Todos</option>
              <option *ngFor="let status of statusOptions" [value]="status">{{ status }}</option>
            </select>
          </label>
          <button type="submit" class="refresh-btn" [disabled]="exporting">
            {{ exporting ? 'Generando…' : 'Descargar .xlsx' }}
          </button>
        </form>
        <p class="export-error" *ngIf="exportError" role="alert">{{ exportError }}</p>
        <p class="export-ok" *ngIf="exportMessage" role="status">{{ exportMessage }}</p>
      </section>
    </section>
  `,
  styles: [`
    .dash-shell { max-width: 1180px; margin: 0 auto; padding: 36px 24px 72px; color: #1d1d1f; }
    .dash-header {
      display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap;
      margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #e5e5ea;
    }
    .eyebrow { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #86868b; }
    h1 { margin: 6px 0 8px; font-size: 2rem; letter-spacing: -0.03em; }
    .subtitle { margin: 0; color: #6e6e73; line-height: 1.5; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .updated { font-size: 0.78rem; color: #86868b; }
    .refresh-btn {
      border-radius: 980px; padding: 9px 16px; font-size: 0.8rem; font-weight: 600; cursor: pointer;
      background: #1d1d1f; color: #fff; border: none;
    }
    .refresh-btn:disabled { opacity: 0.6; cursor: default; }
    .alert-error {
      padding: 13px 16px; margin-bottom: 18px; border-radius: 12px; background: #fef2f2; color: #991b1b;
      border: 1px solid #fecaca; font-size: 0.88rem; font-weight: 600;
    }
    .empty-state, .empty-inline { color: #6e6e73; font-size: 0.9rem; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .kpi {
      background: #fff; border: 1px solid #e5e5ea; border-radius: 20px; padding: 20px;
      display: flex; flex-direction: column; gap: 6px; min-width: 0;
    }
    .kpi.accent { background: #1d1d1f; color: #fff; border-color: #1d1d1f; }
    .kpi-label { font-size: 0.78rem; font-weight: 600; color: #86868b; }
    .kpi.accent .kpi-label, .kpi.accent .kpi-hint { color: #c7c7cc; }
    .kpi-value { font-size: 1.9rem; letter-spacing: -0.03em; overflow-wrap: anywhere; }
    .kpi-hint { font-size: 0.8rem; color: #6e6e73; }
    .panel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 16px; }
    .panel { background: #fff; border: 1px solid #e5e5ea; border-radius: 20px; padding: 20px; min-width: 0; }
    .panel h2 { margin: 0 0 14px; font-size: 1.05rem; }
    .panel-hint { margin: 10px 0 0; font-size: 0.78rem; color: #86868b; line-height: 1.45; }
    .panel h2 + .panel-hint { margin: -8px 0 12px; }
    .bars { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .bars li { display: grid; grid-template-columns: 130px 1fr 48px; align-items: center; gap: 10px; font-size: 0.85rem; }
    .bar-track { height: 10px; background: #f2f2f7; border-radius: 980px; overflow: hidden; }
    .bar-fill { display: block; height: 100%; background: #1d1d1f; border-radius: 980px; }
    .bar-fill[data-tone='ok'] { background: #16a34a; }
    .bar-fill[data-tone='done'] { background: #2563eb; }
    .bar-fill[data-tone='wait'] { background: #d97706; }
    .bar-fill[data-tone='review'] { background: #7c3aed; }
    .bar-fill[data-tone='bad'] { background: #dc2626; }
    .bar-value { text-align: right; font-weight: 700; }
    .cities { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .cities li { display: grid; grid-template-columns: 28px 1fr; column-gap: 10px; align-items: center; }
    .rank {
      grid-row: span 2; width: 28px; height: 28px; border-radius: 50%; background: #f2f2f7;
      display: grid; place-items: center; font-weight: 700; font-size: 0.8rem;
    }
    .city-name { font-weight: 700; font-size: 0.92rem; }
    .city-meta { font-size: 0.78rem; color: #6e6e73; }
    .revenue { margin: 0; display: flex; flex-direction: column; gap: 10px; }
    .revenue div { display: flex; justify-content: space-between; gap: 12px; font-size: 0.88rem; }
    .revenue dt { color: #6e6e73; }
    .revenue dd { margin: 0; font-weight: 700; }
    .export-panel { margin-top: 16px; }
    .export-form { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; margin-top: 14px; }
    .export-form label {
      display: flex; flex-direction: column; gap: 6px; font-size: 0.72rem; font-weight: 700; color: #6e6e73;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .export-form select, .export-form input {
      height: 38px; padding: 0 10px; border-radius: 10px; border: 1px solid #d2d2d7; background: #fff;
      font: inherit; font-size: 0.86rem; color: #1d1d1f; text-transform: none; letter-spacing: normal; font-weight: 500; min-width: 0;
    }
    .export-form .refresh-btn { height: 38px; }
    .export-error { margin: 12px 0 0; color: #b91c1c; font-size: 0.84rem; font-weight: 600; }
    .export-ok { margin: 12px 0 0; color: #166534; font-size: 0.84rem; font-weight: 600; }
    @media (max-width: 520px) {
      .export-form label { flex: 1 1 100%; }
      .dash-shell { padding: 24px 16px 56px; }
      .bars li { grid-template-columns: 100px 1fr 40px; }
    }
  `],
})
export class BusinessDashboardComponent implements OnInit {
  dashboard: Dashboard | null = null;
  loading = false;
  errorMessage = '';
  roleBars: Bar[] = [];
  statusBars: Bar[] = [];
  readonly exportReports = EXPORT_REPORTS;
  exportFilters: ExportFilters = { report: 'reservas', from: '', to: '', city: '', status: '' };
  exporting = false;
  exportError = '';
  exportMessage = '';

  private readonly copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  ngOnInit(): void {
    void this.load();
  }

  cop(value: number): string {
    return this.copFormatter.format(value);
  }

  /** CA1: carga los indicadores del API; CA3: si no es administrador, el API responde 403 y se informa. */
  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const token = getActiveSession()?.token;
      const response = await fetch('/api/reports/dashboard', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.errorMessage =
          response.status === 401
            ? 'Tu sesión expiró. Inicia sesión de nuevo como administrador.'
            : response.status === 403
              ? 'Solo el administrador puede ver los indicadores del negocio.'
              : 'No fue posible cargar los indicadores.';
        return;
      }
      this.setDashboard(body as Dashboard);
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  get statusOptions(): string[] {
    return EXPORT_REPORTS.find((report) => report.value === this.exportFilters.report)?.statuses ?? [];
  }

  /** Parámetros de GET /api/reports/export/:report con los filtros elegidos. */
  exportQuery(): string {
    const { from, to, city, status, report } = this.exportFilters;
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (city.trim() && report !== 'usuarios') params.set('city', city.trim());
    if (status) params.set('status', status);
    return params.toString();
  }

  /** HU-058 CA1: descarga el reporte .xlsx con los filtros elegidos. */
  async exportReport(): Promise<void> {
    const { from, to, report } = this.exportFilters;
    this.exportError = '';
    this.exportMessage = '';
    if (from && to && from > to) {
      this.exportError = 'La fecha «Desde» no puede ser posterior a «Hasta».';
      return;
    }
    this.exporting = true;
    try {
      const token = getActiveSession()?.token;
      const query = this.exportQuery();
      const response = await fetch(`/api/reports/export/${report}${query ? `?${query}` : ''}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        this.exportError =
          response.status === 403
            ? 'Solo el administrador puede exportar reportes.'
            : [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible generar el reporte.';
        return;
      }
      const fileName = fileNameFrom(response.headers.get('Content-Disposition'), `stayhub-${report}.xlsx`);
      this.download(await response.blob(), fileName);
      this.exportMessage = `Se descargó ${fileName}.`;
    } catch {
      this.exportError = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.exporting = false;
    }
  }

  download(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  setDashboard(dashboard: Dashboard): void {
    this.dashboard = dashboard;
    this.roleBars = toBars(
      (['HUESPED', 'ANFITRION', 'ADMINISTRADOR'] as const).map((role) => [ROLE_LABELS[role], dashboard.usersByRole[role]]),
    );
    const tones: Record<string, string> = { CONFIRMADA: 'ok', COMPLETADA: 'done', PENDIENTE: 'wait', EN_REVISION: 'review', CANCELADA: 'bad' };
    this.statusBars = toBars(
      (['CONFIRMADA', 'COMPLETADA', 'PENDIENTE', 'EN_REVISION', 'CANCELADA'] as const).map((status) => [
        BOOKING_STATUS_LABELS[status],
        dashboard.bookingsByStatus[status],
        tones[status],
      ]),
    );
  }
}
