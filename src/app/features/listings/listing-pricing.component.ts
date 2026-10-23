import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import { ListingPricing } from '../../shared/models/listing.model';

/** HU-015 CA2 (RN-013): rango permitido del descuento por estancia larga. */
export const MAX_LONG_STAY_DISCOUNT = 50;

export interface PricingFormErrors {
  cleaningFee?: string;
  discountPercent?: string;
  minNights?: string;
}

/**
 * HU-015 CA3: valida en el cliente los mismos rangos que el servidor:
 * limpieza >= 0 COP, descuento entre 0 % y 50 % y noches mínimas >= 1 cuando hay descuento.
 */
export function validatePricingForm(
  cleaningFee: number | null,
  discountPercent: number | null,
  minNights: number | null,
): PricingFormErrors {
  const errors: PricingFormErrors = {};
  if (cleaningFee === null || !Number.isFinite(cleaningFee) || cleaningFee < 0) {
    errors.cleaningFee = 'La tarifa de limpieza debe ser mayor o igual a 0 COP.';
  }
  const percent = discountPercent ?? 0;
  if (!Number.isFinite(percent) || percent < 0 || percent > MAX_LONG_STAY_DISCOUNT) {
    errors.discountPercent = 'El descuento debe estar entre 0 % y 50 %.';
  }
  if (percent > 0 && (minNights === null || !Number.isInteger(minNights) || minNights < 1)) {
    errors.minNights = 'Indica un número entero de noches mínimas (al menos 1).';
  }
  return errors;
}

/**
 * HU-015 · Definir limpieza y descuento por estancia larga (CA1, CA2, CA3, RF-019).
 * El anfitrión define la tarifa de limpieza fija y un descuento por duración para su publicación.
 */
@Component({
  selector: 'app-listing-pricing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="pricing-shell">
      <a routerLink="/anfitrion/mis-publicaciones" class="back-link">← Mis publicaciones</a>
      <header>
        <span class="eyebrow">Panel de Anfitrión</span>
        <h1>Limpieza y descuento por estancia larga</h1>
        <p class="subtitle">Los cambios se aplican a las cotizaciones nuevas.</p>
      </header>

      <p class="loading" *ngIf="loading" role="status">Cargando tarifas…</p>
      <div class="alert-error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</div>
      <div class="alert-success" *ngIf="successMessage" role="status">{{ successMessage }}</div>

      <form *ngIf="!loading && loaded" (ngSubmit)="save()" novalidate>
        <label for="cleaningFee">Tarifa de limpieza (COP)</label>
        <input id="cleaningFee" name="cleaningFee" type="number" min="0" step="1000" [(ngModel)]="cleaningFee" />
        <small class="hint">Valor fijo por estancia. Usa 0 si no cobras limpieza.</small>
        <p class="field-error" *ngIf="errors.cleaningFee">{{ errors.cleaningFee }}</p>

        <fieldset>
          <legend>Descuento por estancia larga</legend>
          <div class="row">
            <div>
              <label for="discountPercent">Descuento (%)</label>
              <input id="discountPercent" name="discountPercent" type="number" min="0" max="50" step="1" [(ngModel)]="discountPercent" />
            </div>
            <div>
              <label for="minNights">A partir de (noches)</label>
              <input id="minNights" name="minNights" type="number" min="1" step="1" [(ngModel)]="minNights" />
            </div>
          </div>
          <small class="hint">Entre 0 % y 50 %. Con 0 % no se aplica descuento.</small>
          <p class="field-error" *ngIf="errors.discountPercent">{{ errors.discountPercent }}</p>
          <p class="field-error" *ngIf="errors.minNights">{{ errors.minNights }}</p>
        </fieldset>

        <button type="submit" class="save-btn" [disabled]="saving">{{ saving ? 'Guardando…' : 'Guardar tarifas' }}</button>
      </form>
    </section>
  `,
  styles: [`
    .pricing-shell { max-width: 640px; margin: 0 auto; padding: 36px 24px 72px; color: #1d1d1f; }
    .back-link { font-size: 0.84rem; font-weight: 600; color: #0066cc; text-decoration: none; }
    .eyebrow { display: block; margin-top: 16px; font-size: 0.74rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #86868b; }
    h1 { margin: 6px 0 8px; font-size: 1.6rem; letter-spacing: -0.03em; }
    .subtitle { margin: 0 0 24px; color: #6e6e73; font-size: 0.92rem; }
    form { display: flex; flex-direction: column; gap: 8px; background: #fff; border: 1px solid #e5e5ea; border-radius: 18px; padding: 22px; }
    label { font-size: 0.86rem; font-weight: 600; }
    input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d2d2d7; border-radius: 10px; font-size: 0.95rem; }
    fieldset { margin: 14px 0 0; padding: 0; border: none; display: flex; flex-direction: column; gap: 8px; }
    legend { font-weight: 700; margin-bottom: 8px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .hint { font-size: 0.78rem; color: #86868b; }
    .field-error { margin: 0; font-size: 0.82rem; color: #b91c1c; font-weight: 600; }
    .save-btn { margin-top: 16px; padding: 11px 18px; border: none; border-radius: 980px; background: #1d1d1f; color: #fff; font-weight: 600; cursor: pointer; }
    .save-btn:disabled { opacity: 0.6; cursor: progress; }
    .loading { color: #6e6e73; }
    .alert-error, .alert-success { padding: 13px 16px; margin-bottom: 16px; border-radius: 12px; font-size: 0.88rem; font-weight: 600; }
    .alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .alert-success { background: #e8f8ee; color: #166534; border: 1px solid #bbf7d0; }
  `],
})
export class ListingPricingComponent implements OnInit {
  listingId = '';
  cleaningFee: number | null = 0;
  discountPercent: number | null = 0;
  minNights: number | null = null;
  errors: PricingFormErrors = {};
  loading = false;
  loaded = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    this.listingId = this.route.snapshot.paramMap.get('id') ?? '';
    void this.load();
  }

  private headers(json = false): Record<string, string> {
    const token = getActiveSession()?.token;
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  private url(): string {
    return `/api/listings/${encodeURIComponent(this.listingId)}/pricing`;
  }

  private apply(pricing: ListingPricing): void {
    this.cleaningFee = pricing.cleaningFee;
    this.discountPercent = pricing.longStayDiscount?.percentage ?? 0;
    this.minNights = pricing.longStayDiscount?.minNights ?? null;
  }

  private failureMessage(status: number, body: { message?: string | string[] }): string {
    if (status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.';
    if (status === 403) return 'Solo los anfitriones pueden definir tarifas.';
    if (status === 404) return 'La publicación no existe o no te pertenece.';
    const message = [body?.message].flat().filter(Boolean).join(' ');
    return message || 'No fue posible guardar las tarifas.';
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await fetch(this.url(), { headers: this.headers() });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.errorMessage = this.failureMessage(response.status, body);
        return;
      }
      this.apply(body as ListingPricing);
      this.loaded = true;
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  /** HU-015 CA1/CA2: guarda las tarifas; CA3: valores fuera de rango se rechazan antes y en el servidor. */
  async save(): Promise<void> {
    this.successMessage = '';
    this.errorMessage = '';
    this.errors = validatePricingForm(this.cleaningFee, this.discountPercent, this.minNights);
    if (Object.keys(this.errors).length > 0) {
      return;
    }

    const percent = this.discountPercent ?? 0;
    const payload = {
      cleaningFee: this.cleaningFee,
      longStayDiscountPercent: percent,
      ...(percent > 0 ? { longStayMinNights: this.minNights } : {}),
    };

    this.saving = true;
    try {
      const response = await fetch(this.url(), {
        method: 'PATCH',
        headers: this.headers(true),
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.errorMessage = this.failureMessage(response.status, body);
        return;
      }
      this.apply(body as ListingPricing);
      this.successMessage = 'Tarifas guardadas. Se aplicarán en las cotizaciones nuevas.';
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.saving = false;
    }
  }
}
