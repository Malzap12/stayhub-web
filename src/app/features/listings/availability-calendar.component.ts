import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { getActiveSession } from '../../core/guards/auth.guard';

export type CalendarDayStatus = 'DISPONIBLE' | 'NO_DISPONIBLE' | 'RESERVADA' | 'BLOQUEADA' | 'SIN_PERIODO' | 'PASADA';

export interface ListingCalendar {
  listingId: string;
  view: 'PUBLICA' | 'ANFITRION';
  today: string;
  from: string;
  to: string;
  months: Array<{ month: string; days: Array<{ date: string; status: CalendarDayStatus }> }>;
}

interface CalendarCell {
  date: string;
  day: number;
  status: CalendarDayStatus;
}

export const STATUS_LABELS: Record<CalendarDayStatus, string> = {
  DISPONIBLE: 'Disponible',
  NO_DISPONIBLE: 'No disponible',
  RESERVADA: 'Reservada',
  BLOQUEADA: 'Bloqueada',
  SIN_PERIODO: 'Sin periodo habilitado',
  PASADA: 'Fecha pasada',
};

const LEGEND: Record<ListingCalendar['view'], CalendarDayStatus[]> = {
  PUBLICA: ['DISPONIBLE', 'NO_DISPONIBLE'],
  ANFITRION: ['DISPONIBLE', 'RESERVADA', 'BLOQUEADA', 'SIN_PERIODO'],
};

const monthFormatter = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Nombre del mes en español: "2026-11" -> "Noviembre de 2026". */
export function monthLabel(month: string): string {
  const label = monthFormatter.format(new Date(`${month}-01T00:00:00.000Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Celdas de un mes empezando en lunes: null para los huecos antes del día 1. */
export function monthGrid(days: Array<{ date: string; status: CalendarDayStatus }>): Array<CalendarCell | null> {
  if (days.length === 0) {
    return [];
  }
  const firstWeekday = new Date(`${days[0].date}T00:00:00.000Z`).getUTCDay(); // 0 = domingo
  const leading = (firstWeekday + 6) % 7;
  return [
    ...Array.from({ length: leading }, () => null),
    ...days.map((day) => ({ date: day.date, day: Number(day.date.slice(8, 10)), status: day.status })),
  ];
}

/**
 * HU-022 · Calendario de disponibilidad de los próximos 12 meses (CA1, CA2, RF-028).
 * El API decide la vista: pública (disponible / no disponible) o del anfitrión (disponible, reservada,
 * bloqueada y sin periodo), según la sesión que se envía.
 */
@Component({
  selector: 'app-availability-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="calendar" aria-label="Calendario de disponibilidad">
      <header class="calendar-header">
        <h2>{{ title }}</h2>
        <div class="pager" *ngIf="calendar && monthsPerPage < calendar.months.length">
          <button type="button" (click)="page = page - 1" [disabled]="page === 0" aria-label="Meses anteriores">‹</button>
          <button type="button" (click)="page = page + 1" [disabled]="(page + 1) * monthsPerPage >= calendar.months.length" aria-label="Meses siguientes">›</button>
        </div>
        <ul class="legend" *ngIf="calendar">
          <li *ngFor="let status of legend"><span class="swatch" [attr.data-status]="status"></span>{{ label(status) }}</li>
        </ul>
      </header>

      <p class="muted" *ngIf="loading" role="status">Cargando calendario…</p>
      <p class="muted" *ngIf="!loading && unavailable">El calendario no está disponible para esta publicación.</p>
      <div class="alert-error" *ngIf="!loading && errorMessage" role="alert">
        {{ errorMessage }}
        <button type="button" class="retry-btn" (click)="load()">Reintentar</button>
      </div>

      <ng-container *ngIf="!loading && calendar">
        <p class="summary" *ngIf="calendar.view === 'PUBLICA'">
          {{ availableNights }} noches disponibles hasta el {{ longDate(calendar.to) }}.
        </p>
        <p class="summary" *ngIf="calendar.view === 'ANFITRION'">
          Próximos 12 meses: {{ count('DISPONIBLE') }} disponibles · {{ count('RESERVADA') }} reservadas · {{ count('BLOQUEADA') }} bloqueadas.
        </p>

        <div class="months" [class.paged]="monthsPerPage < calendar.months.length">
          <div class="month" *ngFor="let month of visibleMonths">
            <h3>{{ monthName(month.month) }}</h3>
            <div class="weekdays" aria-hidden="true">
              <span *ngFor="let d of weekdays">{{ d }}</span>
            </div>
            <div class="days" role="list">
              <ng-container *ngFor="let cell of grid(month.days)">
                <span class="day empty" *ngIf="!cell" aria-hidden="true"></span>
                <span
                  *ngIf="cell"
                  class="day"
                  role="listitem"
                  [attr.data-status]="cell.status"
                  [attr.data-date]="cell.date"
                  [class.today]="cell.date === calendar.today"
                  [title]="cell.date + ' · ' + label(cell.status)"
                  [attr.aria-label]="cell.date + ': ' + label(cell.status)"
                >{{ cell.day }}</span>
              </ng-container>
            </div>
          </div>
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    .calendar-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    h2 {
      margin: 0;
      font-size: 1.08rem;
    }
    .legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 0.78rem;
      color: #3a3a3c;
    }
    .legend li {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .swatch {
      width: 12px;
      height: 12px;
      border-radius: 4px;
      display: inline-block;
    }
    .summary, .muted {
      margin: 0 0 14px;
      font-size: 0.86rem;
      color: #6e6e73;
    }
    .alert-error {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 12px;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      font-size: 0.86rem;
      font-weight: 600;
    }
    .retry-btn {
      padding: 4px 12px;
      border-radius: 980px;
      border: 1px solid #fecaca;
      background: #ffffff;
      color: #991b1b;
      font-weight: 600;
      cursor: pointer;
    }
    .pager {
      display: flex;
      gap: 6px;
      order: 3;
    }
    .pager button {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid #d2d2d7;
      background: #ffffff;
      font-size: 1.1rem;
      line-height: 1;
      cursor: pointer;
    }
    .pager button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .months.paged {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
      gap: 28px;
    }
    .months {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 18px;
    }
    .month h3 {
      margin: 0 0 6px;
      font-size: 0.86rem;
      font-weight: 700;
    }
    .weekdays, .days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 3px;
    }
    .weekdays span {
      text-align: center;
      font-size: 0.66rem;
      font-weight: 700;
      color: #86868b;
    }
    .day {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 7px;
      font-size: 0.74rem;
      font-weight: 600;
    }
    .day.empty {
      background: transparent;
    }
    .day.today {
      outline: 2px solid #1d1d1f;
      outline-offset: -2px;
    }
    [data-status='DISPONIBLE'] { background: #dcfce7; color: #166534; }
    [data-status='NO_DISPONIBLE'] { background: #f1f1f3; color: #a1a1a6; text-decoration: line-through; }
    [data-status='RESERVADA'] { background: #dbeafe; color: #1e40af; }
    [data-status='BLOQUEADA'] { background: #fee2e2; color: #991b1b; }
    [data-status='SIN_PERIODO'] { background: #f5f5f7; color: #a1a1a6; }
    [data-status='PASADA'] { background: transparent; color: #c7c7cc; }
    .swatch[data-status='NO_DISPONIBLE'] { text-decoration: none; }
  `],
})
export class AvailabilityCalendarComponent implements OnChanges {
  @Input() listingId = '';
  @Input() title = 'Calendario de disponibilidad';
  /** Meses visibles a la vez; con menos de 12 se navega con flechas (detalle de la publicación). */
  @Input() monthsPerPage = 12;
  page = 0;

  readonly weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  calendar: ListingCalendar | null = null;
  loading = false;
  unavailable = false;
  errorMessage = '';

  ngOnChanges(): void {
    void this.load();
  }

  get visibleMonths(): ListingCalendar['months'] {
    const months = this.calendar?.months ?? [];
    return months.slice(this.page * this.monthsPerPage, (this.page + 1) * this.monthsPerPage);
  }

  longDate(date: string): string {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  get legend(): CalendarDayStatus[] {
    return this.calendar ? LEGEND[this.calendar.view] : [];
  }

  get availableNights(): number {
    return this.count('DISPONIBLE');
  }

  count(status: CalendarDayStatus): number {
    return this.calendar?.months.reduce((sum, month) => sum + month.days.filter((day) => day.status === status).length, 0) ?? 0;
  }

  label(status: CalendarDayStatus): string {
    return STATUS_LABELS[status];
  }

  monthName(month: string): string {
    return monthLabel(month);
  }

  grid(days: Array<{ date: string; status: CalendarDayStatus }>): Array<CalendarCell | null> {
    return monthGrid(days);
  }

  /** Envía la sesión: si es el anfitrión dueño o el admin, el API devuelve la vista detallada (CA2). */
  async load(): Promise<void> {
    if (!this.listingId) {
      this.calendar = null;
      return;
    }
    this.loading = true;
    this.unavailable = false;
    this.errorMessage = '';
    try {
      const token = getActiveSession()?.token;
      const response = await fetch(`/api/listings/${encodeURIComponent(this.listingId)}/calendar`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.status === 404) {
        this.calendar = null;
        this.unavailable = true;
        return;
      }
      if (!response.ok) {
        this.errorMessage = 'No fue posible cargar el calendario.';
        return;
      }
      this.calendar = (await response.json()) as ListingCalendar;
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor.';
    } finally {
      this.loading = false;
    }
  }
}
