import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
 * El huésped elige fechas, huéspedes y servicios adicionales y ve el desglose línea por línea en COP.
 */
@Component({
  selector: 'app-stay-quote',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="quote" (ngSubmit)="submit()" novalidate aria-label="Cotizar estancia">
      <h3>Cotiza tu estancia</h3>
      <div class="dates">
        <label>
          <span>Llegada</span>
          <input type="date" name="checkIn" [(ngModel)]="checkIn" (ngModelChange)="clear()" />
        </label>
        <label>
          <span>Salida</span>
          <input type="date" name="checkOut" [min]="checkIn" [(ngModel)]="checkOut" (ngModelChange)="clear()" />
        </label>
      </div>
      <label>
        <span>Huéspedes</span>
        <input type="number" name="guests" min="1" [attr.max]="maxGuests || null" [(ngModel)]="guests" (ngModelChange)="clear()" />
      </label>

      <fieldset *ngIf="additionalServices.length > 0">
        <legend>Servicios adicionales</legend>
        <label class="extra" *ngFor="let service of additionalServices">
          <input type="checkbox" [checked]="selected.has(service.name)" (change)="toggle(service.name)" />
          <span>{{ service.name }}</span>
          <strong>{{ amount(service.cost) }}</strong>
        </label>
      </fieldset>

      <p class="error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</p>
      <button type="submit" [disabled]="loading">{{ loading ? 'Cotizando…' : 'Cotizar' }}</button>

      <!-- CA1-CA4: desglose en COP -->
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
    </form>
  `,
  styles: [`
    .quote {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid #e5e5ea;
    }
    h3 {
      margin: 0;
      font-size: 0.98rem;
    }
    .dates {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.74rem;
      font-weight: 700;
      color: #6e6e73;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    input[type='date'], input[type='number'] {
      height: 38px;
      padding: 0 10px;
      border: 1px solid #d2d2d7;
      border-radius: 10px;
      font: inherit;
      font-size: 0.86rem;
      color: #1d1d1f;
      text-transform: none;
      letter-spacing: normal;
      font-weight: 400;
      width: 100%;
      box-sizing: border-box;
    }
    fieldset {
      border: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    legend {
      font-size: 0.74rem;
      font-weight: 700;
      color: #6e6e73;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .extra {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      text-transform: none;
      letter-spacing: normal;
      font-size: 0.86rem;
      font-weight: 500;
      color: #1d1d1f;
      cursor: pointer;
    }
    .extra span {
      flex: 1;
    }
    .extra input {
      width: auto;
    }
    button {
      height: 42px;
      border: none;
      border-radius: 980px;
      background: #1d1d1f;
      color: #ffffff;
      font-weight: 600;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.6;
      cursor: progress;
    }
    .error {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 600;
      color: #d70015;
    }
    .breakdown {
      margin: 4px 0 0;
    }
    .breakdown div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 7px 0;
      font-size: 0.88rem;
    }
    .breakdown dt {
      color: #3a3a3c;
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
      margin-top: 4px;
      padding-top: 10px;
      border-top: 1px solid #e5e5ea;
      font-size: 1rem;
    }
    .breakdown .total dt, .breakdown .total dd {
      font-weight: 800;
      color: #1d1d1f;
    }
  `],
})
export class StayQuoteComponent {
  @Input() listingId = '';
  @Input() maxGuests?: number;
  @Input() additionalServices: Array<{ name: string; cost: number }> = [];

  checkIn = '';
  checkOut = '';
  guests = 1;
  readonly selected = new Set<string>();
  quote: StayQuote | null = null;
  loading = false;
  errorMessage = '';

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
    return '';
  }

  async submit(): Promise<void> {
    this.quote = null;
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
          // Mantiene el orden en que la publicación ofrece los servicios.
          additionalServices: this.additionalServices.map((s) => s.name).filter((name) => this.selected.has(name)),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.errorMessage = [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible cotizar la estancia.';
        return;
      }
      this.quote = body as StayQuote;
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }
}
