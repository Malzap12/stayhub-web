import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import {
  ServiceFeeConfig,
  validateServiceFeeInput,
} from '../../shared/models/platform.model';

@Component({
  selector: 'app-platform-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="settings-shell">
      <header class="settings-header">
        <div>
          <span class="eyebrow">Panel de Administración</span>
          <h1>Configuración de la Plataforma</h1>
          <p class="subtitle">
            Ajusta los parámetros operativos del sistema. Los cambios aplican de forma inmediata.
          </p>
        </div>
        <div class="nav-links">
          <a routerLink="/admin/moderacion" class="nav-link">← Volver a Moderación</a>
        </div>
      </header>

      <div class="alert-success" *ngIf="successMessage" role="status">
        {{ successMessage }}
      </div>

      <div class="alert-error" *ngIf="errorMessage" role="alert">
        {{ errorMessage }}
      </div>

      <div class="card-grid">
        <!-- HU-029: Configurar la tarifa de servicio -->
        <article class="setting-card">
          <div class="card-title-row">
            <h2>Tarifa de Servicio (Comisión)</h2>
            <span class="badge" [class.badge-active]="!loading">
              {{ currentPercent != null ? currentPercent + ' %' : 'Cargando…' }}
            </span>
          </div>
          <p class="card-description">
            Porcentaje aplicado sobre el valor de las noches reservadas en cotizaciones nuevas (entre 0 % y 30 %).
            Las reservas ya confirmadas conservan la tarifa original con que fueron creadas.
          </p>

          <form (ngSubmit)="saveServiceFee()" novalidate>
            <div class="form-group">
              <label for="serviceFeeInput">Porcentaje de tarifa de servicio (%):</label>
              <div class="input-prefix-wrapper">
                <input
                  id="serviceFeeInput"
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  [(ngModel)]="feeInput"
                  name="feeInput"
                  [disabled]="loading || saving"
                  placeholder="Ej. 12"
                />
                <span class="suffix">%</span>
              </div>
              <small class="field-hint">Rango permitido: 0 % a 30 %. Valor actual: {{ currentPercent }} %.</small>
              <p class="field-error" *ngIf="validationError">{{ validationError }}</p>
            </div>

            <div class="card-footer">
              <button
                type="submit"
                class="save-btn"
                [disabled]="loading || saving"
              >
                {{ saving ? 'Guardando…' : 'Guardar tarifa de servicio' }}
              </button>
              <span class="last-updated" *ngIf="updatedAt">
                Última actualización: {{ updatedAt | date:'medium' }}
              </span>
            </div>
          </form>
        </article>
      </div>
    </section>
  `,
  styles: [`
    .settings-shell {
      max-width: 960px;
      margin: 0 auto;
      padding: 36px 24px 72px;
      color: #1d1d1f;
    }
    .settings-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 28px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e5ea;
    }
    .eyebrow {
      font-size: 0.74rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #86868b;
    }
    h1 {
      margin: 6px 0 8px;
      font-size: 1.95rem;
      letter-spacing: -0.03em;
    }
    .subtitle {
      margin: 0;
      color: #6e6e73;
      font-size: 0.92rem;
    }
    .nav-link {
      font-size: 0.88rem;
      font-weight: 600;
      color: #0066cc;
      text-decoration: none;
    }
    .card-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }
    .setting-card {
      background: #ffffff;
      border: 1px solid #e5e5ea;
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
    }
    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .card-title-row h2 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 600;
    }
    .badge {
      padding: 4px 12px;
      border-radius: 980px;
      font-size: 0.85rem;
      font-weight: 700;
      background: #f5f5f7;
      color: #6e6e73;
    }
    .badge-active {
      background: #e8f8ee;
      color: #166534;
    }
    .card-description {
      margin: 0 0 20px;
      color: #6e6e73;
      font-size: 0.9rem;
      line-height: 1.45;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .input-prefix-wrapper {
      position: relative;
      max-width: 200px;
    }
    input {
      width: 100%;
      padding: 10px 32px 10px 14px;
      border: 1px solid #d2d2d7;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      box-sizing: border-box;
      outline: none;
    }
    input:focus {
      border-color: #0071e3;
      box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15);
    }
    .suffix {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #86868b;
      font-weight: 600;
    }
    .field-hint {
      display: block;
      margin-top: 6px;
      color: #86868b;
      font-size: 0.8rem;
    }
    .field-error {
      margin: 6px 0 0;
      color: #b91c1c;
      font-size: 0.84rem;
      font-weight: 600;
    }
    .card-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid #f5f5f7;
    }
    .save-btn {
      padding: 11px 22px;
      border-radius: 980px;
      border: none;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }
    .save-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .last-updated {
      font-size: 0.82rem;
      color: #86868b;
    }
    .alert-success {
      padding: 14px 18px;
      border-radius: 14px;
      background: #e8f8ee;
      color: #166534;
      border: 1px solid #bbf7d0;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .alert-error {
      padding: 14px 18px;
      border-radius: 14px;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 20px;
    }
  `],
})
export class PlatformSettingsComponent implements OnInit {
  currentPercent: number | null = null;
  feeInput: number | null = null;
  updatedAt?: string;
  loading = false;
  saving = false;
  validationError: string | null = null;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    void this.load();
  }

  private authHeaders(json = false): Record<string, string> {
    const token = getActiveSession()?.token;
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await fetch('/api/platform/service-fee', {
        headers: this.authHeaders(),
      });
      if (!response.ok) {
        this.errorMessage = 'No fue posible cargar la tarifa de servicio actual.';
        return;
      }
      const data = (await response.json()) as ServiceFeeConfig;
      this.currentPercent = data.serviceFeePercent ?? data.percentage;
      this.feeInput = this.currentPercent;
      this.updatedAt = data.updatedAt;
    } catch {
      this.errorMessage = 'No se pudo conectar con el servidor.';
    } finally {
      this.loading = false;
    }
  }

  async saveServiceFee(): Promise<void> {
    this.validationError = validateServiceFeeInput(this.feeInput);
    if (this.validationError) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response = await fetch('/api/platform/service-fee', {
        method: 'PATCH',
        headers: this.authHeaders(true),
        body: JSON.stringify({ serviceFeePercent: Number(this.feeInput) }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = [body?.message].flat().filter(Boolean).join(' ');
        this.errorMessage = errorMsg || 'No se pudo actualizar la tarifa de servicio.';
        return;
      }

      const updated = body as ServiceFeeConfig;
      this.currentPercent = updated.serviceFeePercent ?? updated.percentage;
      this.feeInput = this.currentPercent;
      this.updatedAt = updated.updatedAt;
      this.successMessage = `Tarifa de servicio actualizada con éxito al ${this.currentPercent} %. Las cotizaciones nuevas usarán este porcentaje.`;
    } catch {
      this.errorMessage = 'No se pudo conectar con el servidor.';
    } finally {
      this.saving = false;
    }
  }
}
