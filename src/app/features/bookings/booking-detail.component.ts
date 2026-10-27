import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import { formatQuoteAmount } from '../listings/stay-quote.component';

/** Detalle de una reserva tal como lo devuelve GET /api/bookings/:id (HU-033). */
export interface BookingDetail {
  id: string;
  code?: string;
  listingId: string;
  listingTitle?: string;
  listingCity?: string;
  listingImage?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights?: number;
  nightlyRate?: number;
  baseAmount?: number;
  discountPercentage?: number;
  discount?: number;
  cleaningFee?: number;
  additionalServices?: { name: string; cost: number }[];
  serviceFeePercentage?: number;
  serviceFee?: number;
  totalAmount: number;
  currency: string;
  status: string;
  cancellationPolicyName?: string;
  cancellationPolicyDescription?: string;
  payment?: { status: string; reference: string; cardBrand?: string; cardLast4?: string };
  cancellation?: { cancelledAt: string; reason: string; refundAmount: number; refundPercentage: number };
  createdAt?: string;
}

/** HU-033: qué significa cada estado de la reserva. */
export const STATUS_EXPLANATIONS: Record<string, string> = {
  PENDIENTE: 'Creaste la reserva pero falta el pago. Paga con una tarjeta de prueba desde el detalle de la publicación para confirmarla.',
  CONFIRMADA: 'Tu reserva está pagada y las fechas quedaron bloqueadas para ti.',
  CANCELADA: 'La reserva se canceló y las fechas volvieron a estar disponibles.',
  COMPLETADA: 'La estancia ya terminó.',
};

/**
 * HU-033 · Consultar el estado de mis reservas (CA1, CA2 · RF-047).
 * CA1: muestra alojamiento, fechas, huéspedes, desglose, política de cancelación y estado de la reserva.
 * CA2: si la reserva es de otro huésped, el API responde 403 y la página lo indica sin mostrar datos.
 */
@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="detail-shell">
      <a routerLink="/mis-reservas" class="back">← Mis reservas</a>

      <p *ngIf="loading" class="note">Cargando la reserva…</p>
      <div *ngIf="errorMessage" class="error" role="alert">{{ errorMessage }}</div>

      <ng-container *ngIf="booking as b">
        <header class="header">
          <div class="media" [style.background-image]="b.listingImage ? 'url(' + b.listingImage + ')' : null"></div>
          <div>
            <span class="city">{{ b.listingCity }}</span>
            <h1>{{ b.listingTitle || 'Publicación' }}</h1>
            <a [routerLink]="['/listings', b.listingId]" class="link">Ver la publicación</a>
            <p class="code">Reserva {{ b.code || b.id }}</p>
          </div>
        </header>

        <div class="status" [ngClass]="b.status.toLowerCase()">
          <span class="status-tag">{{ b.status }}</span>
          <p>{{ statusExplanation(b.status) }}</p>
        </div>

        <div class="grid">
          <article class="card">
            <h2>Fechas y huéspedes</h2>
            <dl>
              <div><dt>Llegada</dt><dd>{{ formatDate(b.checkIn) }}</dd></div>
              <div><dt>Salida</dt><dd>{{ formatDate(b.checkOut) }}</dd></div>
              <div><dt>Noches</dt><dd>{{ nightsOf(b) }}</dd></div>
              <div><dt>Huéspedes</dt><dd>{{ b.guests }} {{ b.guests === 1 ? 'huésped' : 'huéspedes' }}</dd></div>
            </dl>
          </article>

          <article class="card">
            <h2>Desglose</h2>
            <div class="row" *ngIf="b.nightlyRate !== undefined">
              <span>{{ nightsOf(b) }} noches × {{ money(b.nightlyRate) }}</span><span>{{ money(b.baseAmount ?? 0) }}</span>
            </div>
            <div class="row discount" *ngIf="b.discount">
              <span>Descuento por estancia larga ({{ b.discountPercentage }} %)</span><span>{{ money(b.discount, true) }}</span>
            </div>
            <div class="row" *ngIf="b.cleaningFee !== undefined">
              <span>Tarifa de limpieza</span><span>{{ money(b.cleaningFee) }}</span>
            </div>
            <div class="row" *ngFor="let service of b.additionalServices ?? []">
              <span>{{ service.name }}</span><span>{{ money(service.cost) }}</span>
            </div>
            <div class="row" *ngIf="b.serviceFee !== undefined">
              <span>Tarifa de servicio<span *ngIf="b.serviceFeePercentage !== undefined"> ({{ b.serviceFeePercentage }} %)</span></span><span>{{ money(b.serviceFee) }}</span>
            </div>
            <div class="row total"><span>Total</span><span>{{ money(b.totalAmount) }} {{ b.currency }}</span></div>
            <p class="payment" *ngIf="b.payment">
              Pago {{ b.payment.status }} · {{ b.payment.cardBrand }} ···· {{ b.payment.cardLast4 }} · Ref. {{ b.payment.reference }}
            </p>
          </article>

          <article class="card">
            <h2>Política de cancelación{{ b.cancellationPolicyName ? ': ' + b.cancellationPolicyName : '' }}</h2>
            <p>{{ b.cancellationPolicyDescription || 'Política Flexible: 100 % de devolución hasta 48 horas antes de la llegada y 50 % después.' }}</p>
            <div class="cancelled" *ngIf="b.cancellation">
              <strong>Cancelada el {{ formatDateTime(b.cancellation.cancelledAt) }}.</strong>
              Motivo: {{ b.cancellation.reason }}. Devolución simulada: {{ money(b.cancellation.refundAmount) }} ({{ b.cancellation.refundPercentage }} %).
            </div>
          </article>
        </div>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .detail-shell { max-width: 1000px; margin: 0 auto; padding: 2rem 1rem 4rem; }
      .back { color: #0071e3; text-decoration: none; font-weight: 600; }
      .note { color: #64748b; }
      .error { margin-top: 1.5rem; padding: 1rem 1.25rem; border-radius: 12px; background: #fdecec; color: #b42318; font-weight: 600; }
      .header { display: flex; gap: 1.5rem; align-items: center; margin: 1.5rem 0; }
      .media { width: 180px; height: 130px; border-radius: 16px; background: #e2e8f0 center / cover no-repeat; flex-shrink: 0; }
      .city { text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.08em; color: #64748b; font-weight: 700; }
      h1 { margin: 0.25rem 0; font-size: 1.8rem; }
      .link { color: #0071e3; font-size: 0.9rem; }
      .code { color: #64748b; font-size: 0.85rem; margin: 0.4rem 0 0; }
      .status { display: flex; gap: 1rem; align-items: center; padding: 1rem 1.25rem; border-radius: 14px; background: #f1f5f9; margin-bottom: 1.5rem; }
      .status p { margin: 0; }
      .status-tag { font-weight: 700; padding: 0.3rem 0.8rem; border-radius: 999px; background: #fff; }
      .status.confirmada { background: #e8f7ee; }
      .status.pendiente { background: #fff7e6; }
      .status.cancelada { background: #fdecec; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
      .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 1.25rem; }
      .card h2 { font-size: 1.05rem; margin: 0 0 1rem; }
      dl { margin: 0; display: grid; gap: 0.6rem; }
      dl div { display: flex; justify-content: space-between; gap: 1rem; }
      dt { color: #64748b; }
      dd { margin: 0; font-weight: 600; }
      .row { display: flex; justify-content: space-between; gap: 1rem; padding: 0.35rem 0; }
      .row.discount { color: #15803d; }
      .row.total { border-top: 1px solid #e2e8f0; margin-top: 0.5rem; padding-top: 0.75rem; font-weight: 700; }
      .payment { color: #64748b; font-size: 0.85rem; margin: 0.75rem 0 0; }
      .cancelled { margin-top: 1rem; padding: 0.75rem 1rem; border-radius: 12px; background: #fdecec; color: #b42318; }
      @media (max-width: 600px) { .header { flex-direction: column; align-items: flex-start; } .media { width: 100%; } }
    `,
  ],
})
export class BookingDetailComponent implements OnInit {
  booking: BookingDetail | null = null;
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
      this.errorMessage = 'Inicia sesión para consultar tus reservas.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${session.token}` } });
      const body = await response.json().catch(() => ({}));
      if (response.status === 403) {
        this.errorMessage = 'Esta reserva es de otro huésped. Solo puedes consultar tus reservas.';
      } else if (response.status === 404) {
        this.errorMessage = 'No encontramos esta reserva.';
      } else if (!response.ok) {
        this.errorMessage = [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible cargar la reserva.';
      } else {
        this.booking = body as BookingDetail;
      }
    } catch {
      this.errorMessage = 'Error de conexión al cargar la reserva.';
    } finally {
      this.loading = false;
    }
  }

  statusExplanation(status: string): string {
    return STATUS_EXPLANATIONS[status] ?? '';
  }

  nightsOf(booking: BookingDetail): number {
    return booking.nights ?? Math.round((Date.parse(booking.checkOut) - Date.parse(booking.checkIn)) / 86_400_000);
  }

  money(value: number, negative = false): string {
    return formatQuoteAmount(value, negative);
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${iso.slice(0, 10)}T00:00:00Z`),
    );
  }

  formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(iso));
  }
}
