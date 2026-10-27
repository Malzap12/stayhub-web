import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getActiveSession } from '../../core/guards/auth.guard';

export type PaymentStatus = 'APROBADO' | 'RECHAZADO';

/** Tarjeta de prueba tal como la devuelve GET /api/payments/test-cards (HU-037). */
export interface TestCard {
  number: string;
  brand: string;
  outcome: PaymentStatus;
  declineReason?: string;
  description: string;
}

/** Pago tal como lo devuelve el API (HU-037). */
export interface BookingPayment {
  id: string;
  reference: string;
  bookingId: string;
  status: PaymentStatus;
  declineReason?: string;
  message: string;
  amount: number;
  currency: string;
  cardBrand: string;
  cardLast4: string;
  mode: 'TEST';
  provider: string;
  processedAt: string;
}

/** Respuesta de POST /api/bookings/:id/pay. */
export interface BookingPaymentResult {
  booking: { id: string; status: string; [key: string]: unknown };
  payment: BookingPayment;
}

/** "4242424242424242" -> "4242 4242 4242 4242" */
export function formatCardNumber(value: string): string {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

/**
 * HU-037 · Pagar la reserva en modo de pruebas (CA1, CA2, CA3 · RF-051, RF-052).
 * Formulario de tarjeta de prueba: si el proveedor aprueba, emite `paid` con la referencia y la reserva confirmada;
 * si rechaza, informa que la reserva no se confirmó y que las fechas siguen libres.
 */
@Component({
  selector: 'app-test-card-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="payment" (ngSubmit)="pay()" novalidate aria-label="Pagar con tarjeta de prueba">
      <div class="sandbox" role="note">
        <strong>Modo de pruebas</strong>
        <span>No se cobra dinero real. Usa una de las tarjetas de prueba.</span>
      </div>

      <div class="cards" *ngIf="testCards.length > 0">
        <button
          type="button"
          class="chip"
          *ngFor="let card of testCards"
          [class.declined]="card.outcome === 'RECHAZADO'"
          (click)="useTestCard(card)"
          [attr.aria-label]="'Usar tarjeta ' + card.number + ': ' + card.description"
        >
          <span>{{ card.brand }} ···· {{ card.number.slice(-4) }}</span>
          <small>{{ card.description }}</small>
        </button>
      </div>

      <label>
        <span>Número de tarjeta</span>
        <input name="cardNumber" inputmode="numeric" autocomplete="off" placeholder="4242 4242 4242 4242"
          [ngModel]="cardNumber" (ngModelChange)="onCardNumber($event)" />
      </label>
      <label>
        <span>Titular</span>
        <input name="cardHolder" autocomplete="off" [(ngModel)]="cardHolder" (ngModelChange)="clearMessages()" />
      </label>
      <div class="row">
        <label>
          <span>Mes</span>
          <input name="expMonth" type="number" min="1" max="12" placeholder="MM" [(ngModel)]="expMonth" (ngModelChange)="clearMessages()" />
        </label>
        <label>
          <span>Año</span>
          <input name="expYear" type="number" placeholder="AAAA" [(ngModel)]="expYear" (ngModelChange)="clearMessages()" />
        </label>
        <label>
          <span>CVC</span>
          <input name="cvc" inputmode="numeric" autocomplete="off" maxlength="4" [(ngModel)]="cvc" (ngModelChange)="clearMessages()" />
        </label>
      </div>

      <div class="error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</div>

      <div class="declined-result" *ngIf="result?.payment?.status === 'RECHAZADO'" role="alert">
        <p><strong>Pago RECHAZADO.</strong> {{ result?.payment?.message }}</p>
        <p>La reserva no se confirmó y las fechas siguen disponibles. Puedes intentar con otra tarjeta.</p>
        <p class="ref">Referencia: {{ result?.payment?.reference }}</p>
      </div>

      <div class="approved-result" *ngIf="result?.payment?.status === 'APROBADO'" role="status">
        <p><strong>Pago APROBADO.</strong> Tu reserva quedó confirmada.</p>
        <p class="ref">Referencia: {{ result?.payment?.reference }}</p>
      </div>

      <button type="submit" class="pay" [disabled]="loading || result?.payment?.status === 'APROBADO'">
        {{ loading ? 'Procesando pago…' : payLabel }}
      </button>
    </form>
  `,
  styles: [`
    .payment { display: flex; flex-direction: column; gap: 10px; }
    .sandbox {
      display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 10px;
      background: #fffbeb; border: 1px solid #fde68a; font-size: 0.8rem; color: #92400e;
    }
    .cards { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      display: flex; flex-direction: column; align-items: flex-start; padding: 6px 10px; border-radius: 10px;
      border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; font: inherit; font-size: 0.78rem; cursor: pointer;
    }
    .chip.declined { border-color: #fecaca; background: #fef2f2; color: #b91c1c; }
    .chip small { font-size: 0.7rem; opacity: 0.85; }
    label {
      display: flex; flex-direction: column; gap: 4px; font-size: 0.74rem; font-weight: 700; color: #6e6e73;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    input {
      height: 38px; padding: 0 10px; border: 1px solid #d2d2d7; border-radius: 10px; font: inherit; font-size: 0.86rem;
      color: #1d1d1f; text-transform: none; letter-spacing: normal; font-weight: 400; width: 100%; box-sizing: border-box;
    }
    .row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .error, .declined-result {
      padding: 10px 12px; border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca;
      font-size: 0.82rem; color: #b91c1c;
    }
    .approved-result {
      padding: 10px 12px; border-radius: 10px; background: #f0fdf4; border: 1px solid #bbf7d0;
      font-size: 0.82rem; color: #166534;
    }
    .declined-result p, .approved-result p { margin: 0 0 4px; }
    .ref { font-family: ui-monospace, monospace; font-size: 0.78rem; }
    .pay {
      height: 42px; border: none; border-radius: 980px; background: #1d1d1f; color: #ffffff; font-weight: 600; cursor: pointer;
    }
    .pay:disabled { opacity: 0.6; cursor: progress; }
  `],
})
export class TestCardPaymentComponent implements OnInit {
  @Input() bookingId = '';
  @Input() payLabel = 'Pagar y confirmar';
  /** Se emite cuando el pago queda APROBADO (CA1). */
  @Output() paid = new EventEmitter<BookingPaymentResult>();
  /** Se emite cuando el pago queda RECHAZADO (CA2). */
  @Output() declined = new EventEmitter<BookingPaymentResult>();

  testCards: TestCard[] = [];
  cardNumber = '';
  cardHolder = '';
  expMonth: number | null = null;
  expYear: number | null = null;
  cvc = '';
  loading = false;
  errorMessage = '';
  result: BookingPaymentResult | null = null;

  ngOnInit(): void {
    void this.loadTestCards();
  }

  async loadTestCards(): Promise<void> {
    try {
      const response = await fetch('/api/payments/test-cards');
      if (response.ok) {
        this.testCards = (await response.json()) as TestCard[];
      }
    } catch {
      this.testCards = [];
    }
  }

  onCardNumber(value: string): void {
    this.cardNumber = formatCardNumber(value);
    this.clearMessages();
  }

  /** Rellena el formulario con una tarjeta de prueba y una fecha de vencimiento futura. */
  useTestCard(card: TestCard): void {
    this.cardNumber = formatCardNumber(card.number);
    this.cardHolder ||= 'Huésped de Prueba';
    this.expMonth = 12;
    this.expYear = new Date().getFullYear() + 3;
    this.cvc = '123';
    this.clearMessages();
  }

  clearMessages(): void {
    this.errorMessage = '';
    if (this.result?.payment.status === 'RECHAZADO') {
      this.result = null;
    }
  }

  validate(): string {
    const digits = this.cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(digits)) {
      return 'Ingresa un número de tarjeta válido (13 a 19 dígitos).';
    }
    if (!this.cardHolder.trim()) {
      return 'Ingresa el nombre del titular.';
    }
    const month = Number(this.expMonth);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return 'El mes de vencimiento debe estar entre 1 y 12.';
    }
    const year = Number(this.expYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return 'Ingresa el año de vencimiento con 4 dígitos.';
    }
    if (!/^\d{3,4}$/.test(this.cvc)) {
      return 'El CVC debe tener 3 o 4 dígitos.';
    }
    return '';
  }

  async pay(): Promise<void> {
    this.errorMessage = this.validate();
    if (this.errorMessage) {
      return;
    }
    this.loading = true;
    this.result = null;
    try {
      const token = getActiveSession()?.token;
      const response = await fetch(`/api/bookings/${encodeURIComponent(this.bookingId)}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cardNumber: this.cardNumber.replace(/\s/g, ''),
          cardHolder: this.cardHolder.trim(),
          expMonth: Number(this.expMonth),
          expYear: Number(this.expYear),
          cvc: this.cvc,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.errorMessage = [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible procesar el pago.';
        return;
      }
      this.result = body as BookingPaymentResult;
      if (this.result.payment.status === 'APROBADO') {
        this.paid.emit(this.result);
      } else {
        this.declined.emit(this.result);
      }
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
      // El CVC nunca se conserva después de enviar el pago.
      this.cvc = '';
    }
  }
}
