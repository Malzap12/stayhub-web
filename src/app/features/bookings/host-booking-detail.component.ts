import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import { formatQuoteAmount } from '../listings/stay-quote.component';
import { StatusLabelPipe } from '../../shared/models/display.model';
import {
  formatStayDate,
  guestsText,
  HostBookingDetail,
  hostStatusNote,
  nightsText,
  phoneHref,
} from '../../shared/models/host-booking.model';

/**
 * HU-035 · Detalle de una reserva recibida (CA2 · RF-049).
 * Con la reserva confirmada muestra el contacto del huésped; en otro estado lo oculta y explica por qué.
 */
@Component({
  selector: 'app-host-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusLabelPipe],
  template: `
    <section class="detail-shell">
      <a routerLink="/anfitrion/reservas" class="back">← Reservas recibidas</a>

      <p *ngIf="loading" class="note">Cargando la reserva…</p>
      <div *ngIf="errorMessage" class="error" role="alert">{{ errorMessage }}</div>

      <ng-container *ngIf="booking as b">
        <header class="header">
          <span class="city">{{ b.listingCity }}</span>
          <h1>{{ b.listingTitle }}</h1>
          <p class="code">Reserva {{ b.code || b.id }}</p>
        </header>

        <div class="status" [ngClass]="b.status.toLowerCase()">
          <span class="status-tag">{{ b.status | statusLabel }}</span>
          <p>{{ statusNote(b.status) }}</p>
        </div>

        <div class="grid">
          <article class="card contact-card">
            <h2>Contacto del huésped</h2>
            <ng-container *ngIf="b.guestContact as contact; else noContact">
              <p class="contact-name">{{ contact.name }}</p>
              <a class="contact-line" [href]="'mailto:' + contact.email">{{ contact.email }}</a>
              <a class="contact-line" *ngIf="contact.phone" [href]="tel(contact.phone)">{{ contact.phone }}</a>
              <p class="hint" *ngIf="!contact.phone">El huésped no registró un teléfono.</p>
            </ng-container>
            <ng-template #noContact>
              <p class="contact-name">{{ b.guestName }}</p>
              <p class="contact-hidden">Los datos de contacto se muestran cuando la reserva está confirmada.</p>
            </ng-template>
          </article>

          <article class="card">
            <h2>Fechas y huéspedes</h2>
            <dl>
              <div><dt>Llegada</dt><dd>{{ date(b.checkIn) }}</dd></div>
              <div><dt>Salida</dt><dd>{{ date(b.checkOut) }}</dd></div>
              <div><dt>Noches</dt><dd>{{ nights(b.nights) }}</dd></div>
              <div><dt>Huéspedes</dt><dd>{{ guests(b.guests) }}</dd></div>
              <div><dt>Total</dt><dd>{{ money(b.totalAmount) }} {{ b.currency }}</dd></div>
            </dl>
          </article>

          <article class="card" *ngIf="b.specialRequests || b.additionalServices?.length">
            <h2>Para preparar la llegada</h2>
            <p *ngIf="b.specialRequests" class="requests">«{{ b.specialRequests }}»</p>
            <ul *ngIf="b.additionalServices?.length" class="services">
              <li *ngFor="let service of b.additionalServices">{{ service.name }}</li>
            </ul>
          </article>
        </div>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .detail-shell { max-width: 1000px; margin: 0 auto; padding: 2rem 1rem 4rem; }
      .back { color: #0071e3; text-decoration: none; font-weight: 600; }
      .note { color: #6e6e73; }
      .error { margin-top: 1.5rem; padding: 1rem 1.25rem; border-radius: 12px; background: #fdecec; color: #b42318; font-weight: 600; }
      .header { margin: 1.5rem 0 1rem; }
      .city { text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.08em; color: #6e6e73; font-weight: 700; }
      h1 { margin: 0.25rem 0; font-size: 1.8rem; color: #1d1d1f; overflow-wrap: anywhere; }
      .code { color: #6e6e73; font-size: 0.85rem; margin: 0.4rem 0 0; }
      .status { display: flex; gap: 1rem; align-items: center; padding: 1rem 1.25rem; border-radius: 14px; background: #f5f5f7; margin-bottom: 1.5rem; }
      .status p { margin: 0; }
      .status-tag { font-weight: 700; padding: 0.3rem 0.8rem; border-radius: 999px; background: #fff; white-space: nowrap; }
      .status.confirmada { background: #e8f7ee; }
      .status.pendiente { background: #fff7e6; }
      .status.cancelada { background: #fdecec; }
      .status.en_revision { background: #eef2ff; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; }
      .card { background: #fff; border: 1px solid #e5e5ea; border-radius: 16px; padding: 1.25rem; min-width: 0; }
      .card h2 { font-size: 1.05rem; margin: 0 0 1rem; }
      .contact-name { font-weight: 700; margin: 0 0 0.5rem; }
      .contact-line { display: block; color: #0071e3; text-decoration: none; margin-bottom: 0.35rem; overflow-wrap: anywhere; }
      .contact-hidden, .hint { color: #6e6e73; font-size: 0.88rem; margin: 0; }
      dl { margin: 0; display: grid; gap: 0.6rem; }
      dl div { display: flex; justify-content: space-between; gap: 1rem; }
      dt { color: #6e6e73; }
      dd { margin: 0; font-weight: 600; text-align: right; }
      .requests { margin: 0 0 0.75rem; font-style: italic; color: #3a3a3c; }
      .services { margin: 0; padding-left: 1.1rem; }
      @media (max-width: 600px) { .status { flex-direction: column; align-items: flex-start; } }
    `,
  ],
})
export class HostBookingDetailComponent implements OnInit {
  booking: HostBookingDetail | null = null;
  loading = false;
  errorMessage = '';

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.load(id);
    }
  }

  async load(id: string): Promise<void> {
    const session = getActiveSession();
    if (!session) {
      this.errorMessage = 'Inicia sesión como anfitrión para ver esta reserva.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await fetch(`/api/bookings/host/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${session.token}` } });
      const body = await response.json().catch(() => ({}));
      if (response.status === 404) {
        this.errorMessage = 'No encontramos esta reserva entre las de tus alojamientos.';
      } else if (!response.ok) {
        this.errorMessage = [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible cargar la reserva.';
      } else {
        this.booking = body as HostBookingDetail;
      }
    } catch {
      this.errorMessage = 'Error de conexión al cargar la reserva.';
    } finally {
      this.loading = false;
    }
  }

  statusNote(status: string): string {
    return hostStatusNote(status);
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

  tel(phone: string): string {
    return phoneHref(phone);
  }

  money(value: number): string {
    return formatQuoteAmount(value);
  }
}
