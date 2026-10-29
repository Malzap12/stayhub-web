import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import { StatusLabelPipe } from '../../shared/models/display.model';
import {
  countHostBookings,
  formatStayDate,
  guestsText,
  HOST_BOOKING_FILTERS,
  HostListingBookings,
  nightsText,
} from '../../shared/models/host-booking.model';

/**
 * HU-035 · Consultar las reservas de mis alojamientos (CA1 · RF-049).
 * El anfitrión ve, por alojamiento, las fechas, el huésped, el número de huéspedes y el estado de cada reserva,
 * y abre el detalle para ver el contacto del huésped cuando la reserva está confirmada (CA2).
 */
@Component({
  selector: 'app-host-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusLabelPipe],
  template: `
    <section class="host-bookings-shell">
      <header class="page-header">
        <h1>Reservas recibidas</h1>
        <p>Revisa quién llega a cada uno de tus alojamientos y prepara su llegada.</p>
      </header>

      <div class="filters" role="group" aria-label="Filtrar por estado">
        <button
          type="button"
          *ngFor="let option of filters"
          [class.active]="filter === option.value"
          [attr.aria-pressed]="filter === option.value"
          (click)="setFilter(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <p *ngIf="loading" class="note">Cargando tus reservas…</p>
      <div *ngIf="errorMessage" class="error" role="alert">{{ errorMessage }}</div>

      <div *ngIf="!loading && !errorMessage && groups.length === 0" class="empty">
        <strong>{{ filter === 'TODAS' ? 'Aún no tienes reservas.' : 'No hay reservas con este estado.' }}</strong>
        <span *ngIf="filter === 'TODAS'">Cuando un huésped reserve uno de tus alojamientos, aparecerá aquí.</span>
      </div>

      <p *ngIf="!loading && groups.length > 0" class="summary">
        {{ total }} {{ total === 1 ? 'reserva' : 'reservas' }} en {{ groups.length }} {{ groups.length === 1 ? 'alojamiento' : 'alojamientos' }}
      </p>

      <article class="listing-group" *ngFor="let group of groups">
        <header class="group-header">
          <div class="thumb" [style.background-image]="group.listingImage ? 'url(' + group.listingImage + ')' : null"></div>
          <div>
            <span class="city">{{ group.listingCity }}</span>
            <h2>{{ group.listingTitle }}</h2>
            <span class="count">{{ group.bookings.length }} {{ group.bookings.length === 1 ? 'reserva' : 'reservas' }}</span>
          </div>
        </header>

        <ul class="booking-list">
          <li class="booking-row" *ngFor="let booking of group.bookings">
            <div class="dates">
              <span class="label">Llegada</span>
              <strong>{{ date(booking.checkIn) }}</strong>
              <span class="label">Salida</span>
              <strong>{{ date(booking.checkOut) }}</strong>
            </div>
            <div class="guest">
              <span class="guest-name">{{ booking.guestName }}</span>
              <span class="guest-meta">{{ guests(booking.guests) }} · {{ nights(booking.nights) }}</span>
            </div>
            <span class="status-badge" [ngClass]="booking.status.toLowerCase()">{{ booking.status | statusLabel }}</span>
            <a class="detail-link" [routerLink]="['/anfitrion/reservas', booking.id]">Ver detalle</a>
          </li>
        </ul>
      </article>
    </section>
  `,
  styles: [
    `
      .host-bookings-shell { max-width: 1000px; margin: 0 auto; padding: 2rem 1rem 4rem; }
      .page-header h1 { margin: 0; font-size: 2rem; color: #1d1d1f; }
      .page-header p { margin: 0.4rem 0 1.25rem; color: #6e6e73; }
      .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 1.25rem; }
      .filters button {
        padding: 7px 14px; border-radius: 980px; border: 1px solid #d2d2d7; background: #fff;
        color: #1d1d1f; font-size: 0.85rem; font-weight: 600; cursor: pointer;
      }
      .filters button.active { background: #1d1d1f; border-color: #1d1d1f; color: #fff; }
      .note, .summary { color: #6e6e73; }
      .summary { margin: 0 0 1rem; font-size: 0.9rem; }
      .error { padding: 1rem 1.25rem; border-radius: 12px; background: #fdecec; color: #b42318; font-weight: 600; }
      .empty {
        display: flex; flex-direction: column; gap: 0.35rem; padding: 2rem; border-radius: 18px;
        background: #f5f5f7; color: #3a3a3c; text-align: center;
      }
      .listing-group { background: #fff; border: 1px solid #e5e5ea; border-radius: 18px; padding: 1.25rem; margin-bottom: 1.25rem; }
      .group-header { display: flex; gap: 1rem; align-items: center; margin-bottom: 0.75rem; }
      .thumb { width: 72px; height: 56px; border-radius: 12px; background: #e5e5ea center / cover no-repeat; flex-shrink: 0; }
      .city { text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.08em; color: #6e6e73; font-weight: 700; }
      .group-header h2 { margin: 0.1rem 0; font-size: 1.1rem; color: #1d1d1f; }
      .count { font-size: 0.82rem; color: #6e6e73; }
      .booking-list { list-style: none; margin: 0; padding: 0; }
      .booking-row {
        display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto auto; gap: 1rem; align-items: center;
        padding: 0.85rem 0; border-top: 1px solid #f0f0f2;
      }
      .dates { display: grid; grid-template-columns: auto 1fr; column-gap: 0.6rem; row-gap: 0.15rem; font-size: 0.88rem; }
      .label { color: #6e6e73; }
      .guest { display: flex; flex-direction: column; min-width: 0; }
      .guest-name { font-weight: 600; color: #1d1d1f; overflow-wrap: anywhere; }
      .guest-meta { font-size: 0.84rem; color: #6e6e73; }
      .status-badge { padding: 4px 10px; border-radius: 980px; font-size: 0.78rem; font-weight: 700; background: #f5f5f7; color: #3a3a3c; white-space: nowrap; }
      .status-badge.confirmada { background: #e8f7ee; color: #1a7f37; }
      .status-badge.pendiente { background: #fff7e6; color: #9a5b00; }
      .status-badge.cancelada { background: #fdecec; color: #b42318; }
      .status-badge.en_revision { background: #eef2ff; color: #3730a3; }
      .detail-link { color: #0071e3; font-weight: 600; font-size: 0.88rem; text-decoration: none; white-space: nowrap; }
      @media (max-width: 640px) {
        .booking-row { grid-template-columns: 1fr auto; }
        .dates, .guest { grid-column: 1 / -1; }
      }
    `,
  ],
})
export class HostBookingsComponent implements OnInit {
  readonly filters = HOST_BOOKING_FILTERS;
  filter = 'TODAS';
  groups: HostListingBookings[] = [];
  loading = false;
  errorMessage = '';

  get total(): number {
    return countHostBookings(this.groups);
  }

  ngOnInit(): void {
    void this.load();
  }

  async setFilter(value: string): Promise<void> {
    if (value === this.filter) return;
    this.filter = value;
    await this.load();
  }

  async load(): Promise<void> {
    const session = getActiveSession();
    if (!session) {
      this.errorMessage = 'Inicia sesión como anfitrión para ver tus reservas.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    const query = this.filter === 'TODAS' ? '' : `?status=${encodeURIComponent(this.filter)}`;
    try {
      const response = await fetch(`/api/bookings/host${query}`, { headers: { Authorization: `Bearer ${session.token}` } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.groups = [];
        this.errorMessage = [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible cargar tus reservas.';
        return;
      }
      this.groups = body as HostListingBookings[];
    } catch {
      this.groups = [];
      this.errorMessage = 'Error de conexión al cargar tus reservas.';
    } finally {
      this.loading = false;
    }
  }

  date(iso: string): string {
    return formatStayDate(iso);
  }

  guests(count: number): string {
    return guestsText(count);
  }

  nights(count: number): string {
    return nightsText(count);
  }
}
