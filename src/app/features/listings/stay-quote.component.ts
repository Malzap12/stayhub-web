import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import { BookingPaymentResult, TestCardPaymentComponent } from '../bookings/test-card-payment.component';

/** Cotización tal como la devuelve POST /api/bookings/quote (HU-027). */
export interface StayQuote {
  listingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  nightlyRate: number;
  baseAmount: number;
  discountPercentage: number;
  discount: number;
  cleaningFee: number;
  additionalServices: Array<{ name: string; cost: number }>;
  additionalServicesTotal: number;
  subtotal: number;
  serviceFeePercentage: number;
  serviceFee: number;
  totalAmount: number;
  currency: string;
}

const copFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** HU-027 CA4: importes en COP con separador de miles: 715000 -> "$ 715.000"; los descuentos con signo menos. */
export function formatQuoteAmount(value: number, negative = false): string {
  const formatted = `$ ${copFormatter.format(Math.abs(value))}`;
  return negative && value > 0 ? `− ${formatted}` : formatted;
}

/**
 * HU-027 · Cotizar una estancia (CA1-CA4, RF-036 a RF-038).
 * HU-030 · Reservar de forma inmediata (CA1-CA4, RF-041, RF-045, RF-046, RN-006, RN-015, RNF-008).
 * El huésped elige fechas, huéspedes y adicionales; ve el desglose en COP y puede reservar de inmediato.
 */
@Component({
  selector: 'app-stay-quote',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TestCardPaymentComponent],
  template: `
    <form class="quote" (ngSubmit)="submit()" novalidate aria-label="Cotizar estancia">
      <div class="picker">
        <label class="cell">
          <span>Llegada</span>
          <input type="date" name="checkIn" [(ngModel)]="checkIn" (ngModelChange)="clear()" />
        </label>
        <label class="cell">
          <span>Salida</span>
          <input type="date" name="checkOut" [min]="checkIn" [(ngModel)]="checkOut" (ngModelChange)="clear()" />
        </label>
        <label class="cell full">
          <span>Huéspedes</span>
          <input type="number" name="guests" min="1" [attr.max]="maxGuests || null" [(ngModel)]="guests" (ngModelChange)="clear()" />
        </label>
      </div>
      <p class="hint" *ngIf="maxGuests">Máximo {{ maxGuests }} {{ maxGuests === 1 ? 'huésped' : 'huéspedes' }}.</p>

      <fieldset *ngIf="additionalServices.length > 0">
        <legend>Servicios adicionales</legend>
        <label class="extra" *ngFor="let service of additionalServices">
          <input type="checkbox" [checked]="selected.has(service.name)" (change)="toggle(service.name)" />
          <span>{{ service.name }}</span>
          <strong>{{ amount(service.cost) }}</strong>
        </label>
      </fieldset>

      <div class="error" *ngIf="errorMessage" role="alert">
        <p>{{ errorMessage }}</p>
        <p class="nights" *ngIf="unavailableNights.length > 0">
          Noches no disponibles: {{ nightsLabel }}. Revisa el calendario de disponibilidad.
        </p>
      </div>
      <button type="submit" class="quote-button" *ngIf="!quote" [disabled]="loading">{{ loading ? 'Calculando…' : 'Ver precio total' }}</button>
      <p class="charge-note" *ngIf="!confirmedBooking && !bookingRoleNotice">Aún no se te cobrará nada.</p>

      <!-- Desglose en COP -->
      <dl class="breakdown" *ngIf="quote as q" aria-label="Desglose de la cotización">
        <div><dt>{{ amount(q.nightlyRate) }} × {{ q.nights }} {{ q.nights === 1 ? 'noche' : 'noches' }}</dt><dd>{{ amount(q.baseAmount) }}</dd></div>
        <div class="discount" [class.applied]="q.discount > 0">
          <dt>Descuento por estancia larga<span *ngIf="q.discountPercentage > 0"> ({{ q.discountPercentage }} %)</span></dt>
          <dd>{{ amount(q.discount, true) }}</dd>
        </div>
        <div><dt>Limpieza</dt><dd>{{ amount(q.cleaningFee) }}</dd></div>
        <div class="extra-line" *ngFor="let service of q.additionalServices"><dt>{{ service.name }}</dt><dd>{{ amount(service.cost) }}</dd></div>
        <div><dt>Tarifa de servicio ({{ q.serviceFeePercentage }} %)</dt><dd>{{ amount(q.serviceFee) }}</dd></div>
        <div class="total"><dt>Total</dt><dd>{{ amount(q.totalAmount) }} {{ q.currency }}</dd></div>
      </dl>

      <!-- Reserva inmediata -->
      <!-- RF-041: solo una cuenta de huésped reserva; el anfitrión gestiona sus fechas con bloqueos -->
      <div class="role-note" *ngIf="quote && bookingRoleNotice" role="note">
        <p>{{ bookingRoleNotice }}</p>
        <a *ngIf="isHost" routerLink="/anfitrion/publicaciones">Ir al panel de anfitrión</a>
      </div>

      <div class="instant-booking" *ngIf="quote && !confirmedBooking && !bookingRoleNotice">
        <button
          type="button"
          class="book-button"
          *ngIf="!createdBooking"
          (click)="startInstantBooking()"
          [disabled]="bookingLoading"
        >
          {{ bookingLoading ? 'Preparando reserva…' : 'Reservar' }}
        </button>

        <div class="payment-step" *ngIf="createdBooking">
          <h4>Paga con tarjeta de prueba para confirmar</h4>
          <app-test-card-payment
            [bookingId]="createdBooking.id"
            (paid)="onPaymentApproved($event)"
            (declined)="onPaymentDeclined($event)"
          ></app-test-card-payment>
        </div>
      </div>

      <!-- Reserva confirmada con su código y desglose -->
      <div class="confirmed-card" *ngIf="confirmedBooking" role="status" aria-label="Reserva confirmada">
        <div class="confirmed-header">
          <span class="badge">Confirmada</span>
          <h3>¡Tu reserva está confirmada!</h3>
          <p class="code">Código de reserva: <strong>{{ confirmedBooking.code || confirmedBooking.id }}</strong></p>
          <p class="ref" *ngIf="paymentReference">Referencia de pago: <code>{{ paymentReference }}</code></p>
        </div>

        <div class="confirmed-breakdown" *ngIf="quote as q">
          <h4>Desglose de tu reserva</h4>
          <div><span>{{ amount(q.nightlyRate) }} × {{ q.nights }} noches</span><span>{{ amount(q.baseAmount) }}</span></div>
          <div *ngIf="q.discount > 0"><span>Descuento estancia larga</span><span>{{ amount(q.discount, true) }}</span></div>
          <div><span>Limpieza</span><span>{{ amount(q.cleaningFee) }}</span></div>
          <div *ngFor="let s of q.additionalServices"><span>{{ s.name }}</span><span>{{ amount(s.cost) }}</span></div>
          <div><span>Tarifa de servicio ({{ q.serviceFeePercentage }} %)</span><span>{{ amount(q.serviceFee) }}</span></div>
          <div class="total-confirmed"><span>Total facturado</span><span>{{ amount(q.totalAmount) }} {{ q.currency }}</span></div>
        </div>
      </div>
    </form>
  `,
  styles: [`
    .quote {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .picker {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid #b0b0b0;
      border-radius: 10px;
      overflow: hidden;
    }
    .cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 12px 8px;
      font-size: 0.64rem;
      font-weight: 800;
      color: #222222;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      min-width: 0;
    }
    .cell + .cell {
      border-left: 1px solid #b0b0b0;
    }
    .cell.full {
      grid-column: 1 / -1;
      border-left: none;
      border-top: 1px solid #b0b0b0;
    }
    .cell:focus-within {
      box-shadow: inset 0 0 0 2px #222222;
      border-radius: 10px;
    }
    .cell input {
      border: none;
      padding: 0;
      height: 24px;
      font: inherit;
      font-size: 0.88rem;
      font-weight: 400;
      color: #222222;
      text-transform: none;
      letter-spacing: normal;
      background: transparent;
      width: 100%;
      min-width: 0;
      outline: none;
    }
    fieldset {
      border: 1px solid #ebebeb;
      border-radius: 10px;
      margin: 0;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    legend {
      font-size: 0.72rem;
      font-weight: 800;
      color: #222222;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0 4px;
    }
    .extra {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      font-size: 0.88rem;
      font-weight: 500;
      color: #222222;
      cursor: pointer;
    }
    .extra span {
      flex: 1;
    }
    .extra input {
      width: auto;
      accent-color: #222222;
    }
    button {
      height: 48px;
      border: none;
      border-radius: 10px;
      background: #222222;
      color: #ffffff;
      font: inherit;
      font-size: 0.98rem;
      font-weight: 600;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.6;
      cursor: progress;
    }
    .quote-button, .book-button {
      background: linear-gradient(to right, #e61e4d 0%, #e31c5f 50%, #d70466 100%);
    }
    .role-note {
      padding: 12px 14px;
      border-radius: 10px;
      background: #f7f7f7;
      border: 1px solid #ebebeb;
      font-size: 0.86rem;
      line-height: 1.45;
      color: #222222;
    }
    .role-note p {
      margin: 0;
    }
    .role-note a {
      display: inline-block;
      margin-top: 8px;
      font-weight: 600;
      color: #222222;
    }
    .charge-note {
      margin: -2px 0 0;
      text-align: center;
      font-size: 0.82rem;
      color: #6a6a6a;
    }
    .error {
      padding: 10px 12px;
      border-radius: 10px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      font-size: 0.82rem;
      font-weight: 600;
      color: #b91c1c;
    }
    .error p {
      margin: 0;
    }
    .error .nights {
      margin-top: 4px;
      font-weight: 500;
      color: #7f1d1d;
    }
    .hint {
      margin: -4px 0 0;
      font-size: 0.76rem;
      color: #6a6a6a;
    }
    .breakdown {
      margin: 4px 0 0;
    }
    .breakdown div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 0;
      font-size: 0.94rem;
    }
    .breakdown dt {
      color: #222222;
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .breakdown dd {
      color: #222222;
    }
    .breakdown dd {
      margin: 0;
      font-weight: 600;
      white-space: nowrap;
    }
    .breakdown .discount.applied dd {
      color: #166534;
    }
    .breakdown .total {
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid #dddddd;
      font-size: 1rem;
    }
    .breakdown .total dt {
      text-decoration: none;
    }
    .breakdown .total dt, .breakdown .total dd {
      font-weight: 800;
      color: #1d1d1f;
    }
    .instant-booking {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .book-button {
      height: 48px;
      border: none;
      border-radius: 10px;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.98rem;
      cursor: pointer;
    }
    .book-button:disabled {
      opacity: 0.6;
      cursor: progress;
    }
    .payment-step {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px dashed #d2d2d7;
    }
    .payment-step h4 {
      margin: 0 0 8px;
      font-size: 0.88rem;
      color: #1d1d1f;
    }
    .confirmed-card {
      margin-top: 12px;
      padding: 16px;
      border-radius: 12px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .confirmed-header h3 {
      margin: 6px 0 2px;
      font-size: 1rem;
      color: #166534;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      background: #166534;
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .code {
      margin: 4px 0 0;
      font-size: 0.9rem;
      color: #1d1d1f;
    }
    .code strong {
      font-family: ui-monospace, monospace;
      color: #0f172a;
    }
    .confirmed-breakdown {
      margin-top: 6px;
      padding-top: 8px;
      border-top: 1px solid #bbf7d0;
      font-size: 0.82rem;
      color: #374151;
    }
    .confirmed-breakdown h4 {
      margin: 0 0 6px;
      font-size: 0.84rem;
    }
    .confirmed-breakdown div {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
    }
    .total-confirmed {
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #cbd5e1;
      font-weight: 700;
      color: #111827;
    }
  `],
})
export class StayQuoteComponent implements OnInit {
  @Input() listingId = '';
  @Input() maxGuests?: number;
  @Input() additionalServices: Array<{ name: string; cost: number }> = [];

  private readonly router = inject(Router, { optional: true });

  checkIn = '';
  checkOut = '';
  guests = 1;
  readonly selected = new Set<string>();
  quote: StayQuote | null = null;
  loading = false;
  bookingLoading = false;
  errorMessage = '';
  /** HU-028 CA3: noches del rango que no se pueden reservar, según el API. */
  unavailableNights: string[] = [];

  createdBooking: any = null;
  confirmedBooking: any = null;
  paymentReference = '';
  idempotencyKey = '';

  ngOnInit(): void {
    const saved = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(`pending_booking_${this.listingId}`) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.checkIn = parsed.checkIn || '';
        this.checkOut = parsed.checkOut || '';
        this.guests = parsed.guests || 1;
        (parsed.selected || []).forEach((s: string) => this.selected.add(s));
        sessionStorage.removeItem(`pending_booking_${this.listingId}`);
        void this.submit();
      } catch {}
    }
  }

  amount(value: number, negative = false): string {
    return formatQuoteAmount(value, negative);
  }

  toggle(name: string): void {
    if (this.selected.has(name)) {
      this.selected.delete(name);
    } else {
      this.selected.add(name);
    }
    this.clear();
  }

  clear(): void {
    this.quote = null;
    this.errorMessage = '';
    this.unavailableNights = [];
    this.createdBooking = null;
    this.confirmedBooking = null;
    // HU-032 CA2: otra estancia es otra solicitud y lleva una clave nueva; los reintentos de la misma conservan la suya.
    this.idempotencyKey = '';
  }

  /** "2026-12-20" -> "20 dic. 2026" */
  get nightsLabel(): string {
    const formatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    return this.unavailableNights.map((night) => formatter.format(new Date(`${night}T00:00:00Z`))).join(', ');
  }

  validate(): string {
    if (!this.checkIn || !this.checkOut) {
      return 'Elige la fecha de llegada y la de salida.';
    }
    if (this.checkOut <= this.checkIn) {
      return 'La fecha de salida debe ser posterior a la fecha de llegada.';
    }
    if (!Number.isInteger(Number(this.guests)) || Number(this.guests) < 1) {
      return 'El número de huéspedes debe ser al menos 1.';
    }
    // HU-028 CA2: se avisa antes de llamar al API; el API también lo valida.
    if (this.maxGuests && Number(this.guests) > this.maxGuests) {
      return `Esta publicación admite máximo ${this.maxGuests} ${this.maxGuests === 1 ? 'huésped' : 'huéspedes'}.`;
    }
    return '';
  }

  async submit(): Promise<void> {
    this.quote = null;
    this.unavailableNights = [];
    this.createdBooking = null;
    this.confirmedBooking = null;
    this.idempotencyKey = '';
    this.errorMessage = this.validate();
    if (this.errorMessage) {
      return;
    }
    this.loading = true;
    try {
      const response = await fetch('/api/bookings/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: this.listingId,
          checkIn: this.checkIn,
          checkOut: this.checkOut,
          guests: Number(this.guests),
          additionalServices: this.additionalServices.map((s) => s.name).filter((name) => this.selected.has(name)),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.errorMessage = [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible cotizar la estancia.';
        this.unavailableNights = Array.isArray(body?.unavailableNights) ? body.unavailableNights : [];
        return;
      }
      this.quote = body as StayQuote;
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  /**
   * HU-030 · Reservar de forma inmediata.
   * CA4: Si no ha iniciado sesión, guarda la reserva pendiente y redirige al login.
   * CA1: Crea la reserva en el backend para presentar el formulario de pago sandbox.
   */
  /** Rol de la sesión, si hay una. Sin sesión se puede cotizar y, al reservar, se pide iniciar sesión. */
  get isHost(): boolean {
    return getActiveSession()?.role === 'ANFITRION';
  }

  /** RF-041: el anfitrión y el administrador no reservan; se les explica por qué en lugar del botón Reservar. */
  get bookingRoleNotice(): string {
    const role = getActiveSession()?.role;
    if (role === 'ANFITRION') {
      return 'Estás conectado como anfitrión. Para reservar, inicia sesión con una cuenta de huésped. Si este alojamiento es tuyo, bloquea tus fechas desde el panel de anfitrión.';
    }
    if (role === 'ADMINISTRADOR') {
      return 'Las cuentas de administrador no pueden hacer reservas.';
    }
    return '';
  }

  async startInstantBooking(): Promise<void> {
    if (this.bookingRoleNotice) {
      this.errorMessage = this.bookingRoleNotice;
      return;
    }
    const session = getActiveSession();
    if (!session) {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          `pending_booking_${this.listingId}`,
          JSON.stringify({
            checkIn: this.checkIn,
            checkOut: this.checkOut,
            guests: this.guests,
            selected: Array.from(this.selected),
          }),
        );
      }
      void this.router?.navigate(['/auth/login'], {
        queryParams: { returnUrl: `/listings/${this.listingId}` },
      });
      return;
    }

    this.bookingLoading = true;
    this.errorMessage = '';
    this.idempotencyKey ||= (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('idemp-' + Date.now());

    try {
      const response = await fetch('/api/bookings/instant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          listingId: this.listingId,
          checkIn: this.checkIn,
          checkOut: this.checkOut,
          guests: Number(this.guests),
          additionalServices: Array.from(this.selected),
          idempotencyKey: this.idempotencyKey,
        }),
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        // CA3 · Publicación no activa o rechazo
        this.errorMessage = [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible iniciar la reserva.';
        return;
      }

      this.createdBooking = body;
    } catch {
      this.errorMessage = 'Error de conexión al procesar la reserva.';
    } finally {
      this.bookingLoading = false;
    }
  }

  onPaymentApproved(result: BookingPaymentResult): void {
    this.confirmedBooking = result.booking;
    this.paymentReference = result.payment.reference;
  }

  onPaymentDeclined(result: BookingPaymentResult): void {
    this.paymentReference = result.payment.reference;
  }
}
