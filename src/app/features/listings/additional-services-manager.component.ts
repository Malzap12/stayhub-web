import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getActiveSession } from '../../core/guards/auth.guard';
import {
  AdditionalService,
  AdditionalServiceErrors,
  MAX_ADDITIONAL_SERVICES,
  cleanServiceName,
  validateAdditionalService,
} from '../../shared/models/additional-service.model';

/**
 * HU-016 · Ofrecer servicios adicionales con costo (CA1, CA2 · RF-020, RN-004, RN-013).
 * El anfitrión agrega, modifica y elimina los servicios opcionales de su publicación. Los huéspedes los ven en el
 * detalle y los eligen al cotizar; los cambios solo aplican a cotizaciones nuevas.
 */
@Component({
  selector: 'app-additional-services-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="services-card" aria-labelledby="services-title">
      <header>
        <h2 id="services-title">Servicios adicionales</h2>
        <p class="hint">
          Servicios opcionales con un costo por estancia, como traslados o desayunos. El huésped los elige al cotizar.
          Si cambias o eliminas uno, aplica a las cotizaciones nuevas: las reservas ya hechas conservan su precio.
        </p>
      </header>

      <p class="loading" *ngIf="loading" role="status">Cargando servicios…</p>
      <div class="alert-error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</div>
      <div class="alert-success" *ngIf="successMessage" role="status">{{ successMessage }}</div>

      <ng-container *ngIf="!loading && loaded">
        <p class="empty" *ngIf="services.length === 0">Todavía no ofreces servicios adicionales.</p>

        <ul class="service-list" *ngIf="services.length > 0">
          <li *ngFor="let service of services" class="service-item" [attr.data-id]="service.id">
            <ng-container *ngIf="editingId !== service.id; else editRow">
              <div class="service-info">
                <strong>{{ service.name }}</strong>
                <span>{{ money(service.cost) }} por estancia</span>
              </div>
              <div class="service-actions" *ngIf="confirmDeleteId !== service.id">
                <button type="button" class="btn ghost btn-edit" [disabled]="busy" (click)="startEdit(service)">Editar</button>
                <button type="button" class="btn danger btn-delete" [disabled]="busy" (click)="confirmDeleteId = service.id ?? null">Eliminar</button>
              </div>
              <div class="service-actions confirm" *ngIf="confirmDeleteId === service.id">
                <span>¿Eliminar este servicio?</span>
                <button type="button" class="btn danger solid btn-confirm-delete" [disabled]="busy" (click)="remove(service)">Sí, eliminar</button>
                <button type="button" class="btn ghost" [disabled]="busy" (click)="confirmDeleteId = null">No</button>
              </div>
            </ng-container>

            <ng-template #editRow>
              <form class="edit-form" (ngSubmit)="saveEdit(service)" novalidate>
                <div class="fields">
                  <label>
                    <span>Nombre</span>
                    <input name="editName" type="text" maxlength="80" [(ngModel)]="editName" />
                  </label>
                  <label>
                    <span>Costo (COP)</span>
                    <input name="editCost" type="number" min="1" step="1000" [(ngModel)]="editCost" />
                  </label>
                </div>
                <p class="field-error" *ngIf="editErrors.name">{{ editErrors.name }}</p>
                <p class="field-error" *ngIf="editErrors.cost">{{ editErrors.cost }}</p>
                <div class="service-actions">
                  <button type="submit" class="btn solid btn-save-edit" [disabled]="busy">{{ busy ? 'Guardando…' : 'Guardar' }}</button>
                  <button type="button" class="btn ghost" [disabled]="busy" (click)="cancelEdit()">Cancelar</button>
                </div>
              </form>
            </ng-template>
          </li>
        </ul>

        <form class="add-form" *ngIf="services.length < maxServices; else limitReached" (ngSubmit)="add()" novalidate>
          <h3>Agregar un servicio</h3>
          <div class="fields">
            <label>
              <span>Nombre</span>
              <input id="service-name" name="name" type="text" maxlength="80" placeholder="Ej. Traslado desde el aeropuerto" [(ngModel)]="newName" />
            </label>
            <label>
              <span>Costo por estancia (COP)</span>
              <input id="service-cost" name="cost" type="number" min="1" step="1000" placeholder="Ej. 80000" [(ngModel)]="newCost" />
            </label>
          </div>
          <p class="field-error" *ngIf="newErrors.name">{{ newErrors.name }}</p>
          <p class="field-error" *ngIf="newErrors.cost">{{ newErrors.cost }}</p>
          <button type="submit" class="btn solid btn-add" [disabled]="busy">{{ busy ? 'Guardando…' : 'Agregar servicio' }}</button>
        </form>
        <ng-template #limitReached>
          <p class="hint">Llegaste al máximo de {{ maxServices }} servicios. Elimina uno para agregar otro.</p>
        </ng-template>
      </ng-container>
    </section>
  `,
  styles: [`
    .services-card { margin-top: 20px; background: #fff; border: 1px solid #e5e5ea; border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 12px; }
    h2 { margin: 0 0 4px; font-size: 1.15rem; letter-spacing: -0.02em; }
    h3 { margin: 0; font-size: 0.95rem; }
    .hint { margin: 0; font-size: 0.82rem; color: #6e6e73; line-height: 1.5; }
    .loading, .empty { margin: 0; color: #6e6e73; font-size: 0.88rem; }
    .service-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; border: 1px solid #e5e5ea; border-radius: 14px; overflow: hidden; }
    .service-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; flex-wrap: wrap; }
    .service-item + .service-item { border-top: 1px solid #f0f0f2; }
    .service-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .service-info strong { font-size: 0.92rem; overflow-wrap: anywhere; }
    .service-info span { font-size: 0.82rem; color: #6e6e73; }
    .service-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .service-actions.confirm span { font-size: 0.82rem; font-weight: 600; color: #991b1b; }
    .edit-form, .add-form { display: flex; flex-direction: column; gap: 8px; width: 100%; }
    .add-form { padding-top: 6px; }
    .fields { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 10px; }
    label { display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem; font-weight: 600; min-width: 0; }
    input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d2d2d7; border-radius: 10px; font: inherit; font-size: 0.92rem; font-weight: 400; }
    .btn { border-radius: 980px; padding: 8px 14px; font: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid #d2d2d7; background: #fff; color: #1d1d1f; white-space: nowrap; }
    .btn.solid { background: #1d1d1f; border-color: #1d1d1f; color: #fff; align-self: flex-start; padding: 10px 18px; }
    .btn.danger { border-color: #fecaca; color: #b91c1c; }
    .btn.danger.solid { background: #b91c1c; border-color: #b91c1c; color: #fff; padding: 8px 14px; }
    .btn:disabled { opacity: 0.55; cursor: default; }
    .field-error { margin: 0; font-size: 0.8rem; color: #b91c1c; font-weight: 600; }
    .alert-error, .alert-success { padding: 11px 14px; border-radius: 12px; font-size: 0.85rem; font-weight: 600; }
    .alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .alert-success { background: #e8f8ee; color: #166534; border: 1px solid #bbf7d0; }
    @media (max-width: 520px) {
      .fields { grid-template-columns: 1fr; }
    }
  `],
})
export class AdditionalServicesManagerComponent implements OnInit {
  @Input({ required: true }) listingId = '';

  readonly maxServices = MAX_ADDITIONAL_SERVICES;
  services: AdditionalService[] = [];
  loading = false;
  loaded = false;
  busy = false;
  errorMessage = '';
  successMessage = '';

  newName = '';
  newCost: number | null = null;
  newErrors: AdditionalServiceErrors = {};

  editingId: string | null = null;
  editName = '';
  editCost: number | null = null;
  editErrors: AdditionalServiceErrors = {};

  confirmDeleteId: string | null = null;

  private readonly copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  ngOnInit(): void {
    void this.load();
  }

  money(value: number): string {
    return this.copFormatter.format(value);
  }

  private url(serviceId?: string): string {
    const base = `/api/listings/${encodeURIComponent(this.listingId)}/additional-services`;
    return serviceId ? `${base}/${encodeURIComponent(serviceId)}` : base;
  }

  private headers(json = false): Record<string, string> {
    const token = getActiveSession()?.token;
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(json ? { 'Content-Type': 'application/json' } : {}) };
  }

  private failureMessage(status: number, body: { message?: string | string[] }, fallback: string): string {
    if (status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.';
    if (status === 403) return 'Solo los anfitriones pueden gestionar servicios adicionales.';
    if (status === 404) return 'La publicación o el servicio ya no existen.';
    return [body?.message].flat().filter(Boolean).join(' ') || fallback;
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await fetch(this.url(), { headers: this.headers() });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.errorMessage = this.failureMessage(response.status, body, 'No fue posible cargar los servicios adicionales.');
        return;
      }
      this.services = body as AdditionalService[];
      this.loaded = true;
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  /** Envía el cambio al API y, si lo acepta, muestra la lista que devuelve. */
  private async send(method: 'POST' | 'PATCH' | 'DELETE', url: string, payload: unknown, success: string, fallback: string): Promise<boolean> {
    this.busy = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      const response = await fetch(url, {
        method,
        headers: this.headers(payload !== undefined),
        body: payload !== undefined ? JSON.stringify(payload) : undefined,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.errorMessage = this.failureMessage(response.status, body, fallback);
        return false;
      }
      this.services = body as AdditionalService[];
      this.successMessage = success;
      return true;
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
      return false;
    } finally {
      this.busy = false;
    }
  }

  /** CA1: agrega el servicio con nombre y costo mayor que 0. */
  async add(): Promise<void> {
    this.newErrors = validateAdditionalService(this.newName, this.newCost, this.services);
    if (Object.keys(this.newErrors).length > 0) return;
    const name = cleanServiceName(this.newName);
    const ok = await this.send(
      'POST',
      this.url(),
      { name, cost: this.newCost },
      `«${name}» quedó disponible en tu publicación y los huéspedes ya lo pueden elegir al cotizar.`,
      'No fue posible agregar el servicio.',
    );
    if (ok) {
      this.newName = '';
      this.newCost = null;
    }
  }

  startEdit(service: AdditionalService): void {
    this.editingId = service.id ?? null;
    this.editName = service.name;
    this.editCost = service.cost;
    this.editErrors = {};
    this.confirmDeleteId = null;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editErrors = {};
  }

  /** CA2: modifica el nombre o el costo; aplica a cotizaciones nuevas. */
  async saveEdit(service: AdditionalService): Promise<void> {
    this.editErrors = validateAdditionalService(this.editName, this.editCost, this.services, service.id);
    if (Object.keys(this.editErrors).length > 0) return;
    const name = cleanServiceName(this.editName);
    const ok = await this.send(
      'PATCH',
      this.url(service.id),
      { name, cost: this.editCost },
      `Se actualizó «${name}». Aplica a las cotizaciones nuevas; las reservas ya hechas conservan su precio.`,
      'No fue posible modificar el servicio.',
    );
    if (ok) this.cancelEdit();
  }

  /** CA2: elimina el servicio; deja de ofrecerse en cotizaciones nuevas. */
  async remove(service: AdditionalService): Promise<void> {
    const ok = await this.send(
      'DELETE',
      this.url(service.id),
      undefined,
      `Se eliminó «${service.name}». Las reservas que ya lo incluían lo conservan.`,
      'No fue posible eliminar el servicio.',
    );
    if (ok) this.confirmDeleteId = null;
  }
}
