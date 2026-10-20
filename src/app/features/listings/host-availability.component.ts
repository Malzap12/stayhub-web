import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvailabilityPeriod, Listing } from '../../shared/models/listing.model';

@Component({
  selector: 'app-host-availability',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="host-shell">
      <header class="host-header">
        <div>
          <span class="eyebrow">Panel de Anfitrión</span>
          <h1>Registrar periodos disponibles</h1>
          <p class="subtitle">
            Configura las ventanas de fechas en que tu alojamiento está habilitado para recibir reservas.
          </p>
        </div>
      </header>

      <div class="alert-success" *ngIf="successMessage" role="status">
        {{ successMessage }}
      </div>

      <div class="alert-error" *ngIf="errorMessage" role="alert">
        {{ errorMessage }}
      </div>

      <div class="workspace-grid">
        <!-- Formulario de registro de periodo -->
        <section class="form-card" aria-label="Formulario de nuevo periodo disponible">
          <h2>Nuevo periodo de disponibilidad</h2>

          <div class="field">
            <label for="listing-select">Alojamiento</label>
            <select id="listing-select" [(ngModel)]="selectedListingId" (change)="clearFeedback()">
              <option *ngFor="let item of hostListings" [value]="item.id">
                {{ item.title }} ({{ item.city }})
              </option>
            </select>
          </div>

          <div class="date-row">
            <div class="field">
              <label for="start-date">Fecha de inicio</label>
              <input
                id="start-date"
                type="date"
                [(ngModel)]="startDateInput"
                placeholder="YYYY-MM-DD"
              />
            </div>

            <div class="field">
              <label for="end-date">Fecha de fin</label>
              <input
                id="end-date"
                type="date"
                [(ngModel)]="endDateInput"
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>

          <button type="button" class="btn-primary" (click)="registerPeriod()">
            Guardar periodo disponible
          </button>
        </section>

        <!-- Listado de periodos registrados para el alojamiento seleccionado -->
        <section class="periods-card" aria-label="Periodos disponibles registrados">
          <h2>Periodos habilitados para reservas ({{ selectedListingPeriods.length }})</h2>
          <p class="empty-msg" *ngIf="selectedListingPeriods.length === 0">
            Aún no hay periodos registrados para este alojamiento.
          </p>

          <ul class="period-list" *ngIf="selectedListingPeriods.length > 0">
            <li class="period-item" *ngFor="let period of selectedListingPeriods">
              <div>
                <strong>{{ period.startDate }} → {{ period.endDate }}</strong>
                <span class="period-meta">ID: {{ period.id }}</span>
              </div>
              <span class="badge-available" *ngIf="period.availableForBooking">
                Disponible para reservas
              </span>
            </li>
          </ul>
        </section>
      </div>
    </section>
  `,
  styles: [`
    .host-shell {
      max-width: 1120px;
      margin: 0 auto;
      padding: 36px 24px 72px;
      color: #1d1d1f;
    }
    .host-header {
      margin-bottom: 24px;
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
    .alert-success,
    .alert-error {
      padding: 13px 16px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 0.86rem;
      font-weight: 600;
    }
    .alert-success {
      background: #e8f8ee;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .alert-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .workspace-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 24px;
    }
    .form-card,
    .periods-card {
      background: #ffffff;
      border: 1px solid #e5e5ea;
      border-radius: 20px;
      padding: 24px;
    }
    h2 {
      margin: 0 0 16px;
      font-size: 1.15rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }
    .field label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #3a3a3c;
    }
    .field select,
    .field input {
      height: 40px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid #d2d2d7;
      font-size: 0.88rem;
      font-family: inherit;
    }
    .date-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .btn-primary {
      width: 100%;
      margin-top: 6px;
      padding: 11px 18px;
      border-radius: 980px;
      border: none;
      background: #1d1d1f;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.84rem;
      cursor: pointer;
    }
    .period-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .period-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: #f5f5f7;
      border-radius: 12px;
      font-size: 0.86rem;
    }
    .period-meta {
      display: block;
      font-size: 0.72rem;
      color: #86868b;
      margin-top: 2px;
    }
    .badge-available {
      padding: 4px 10px;
      border-radius: 980px;
      font-size: 0.74rem;
      font-weight: 700;
      background: #e8f8ee;
      color: #166534;
    }
    .empty-msg {
      color: #86868b;
      font-size: 0.86rem;
      margin: 0;
    }
  `],
})
export class HostAvailabilityComponent {
  hostListings: Listing[] = [
    {
      id: 'listing-host-1',
      title: 'Loft Minimalista en El Poblado',
      description: 'Espacio de concreto a la vista y terraza privada.',
      city: 'Medellín',
      capacity: 4,
      pricePerNight: 320000,
      status: 'ACTIVA',
      amenities: ['WIFI', 'WORKSPACE'],
    },
    {
      id: 'listing-host-2',
      title: 'Villa Brutalista Frente al Mar en Barú',
      description: 'Volúmenes limpios en piedra coralina con piscina infinita.',
      city: 'Cartagena',
      capacity: 6,
      pricePerNight: 580000,
      status: 'ACTIVA',
      amenities: ['WIFI', 'POOL'],
    },
  ];

  selectedListingId = 'listing-host-1';
  startDateInput = '';
  endDateInput = '';
  errorMessage = '';
  successMessage = '';

  periods: AvailabilityPeriod[] = [];

  get selectedListingPeriods(): AvailabilityPeriod[] {
    return this.periods
      .filter((p) => p.listingId === this.selectedListingId)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  clearFeedback(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private getTodayString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  registerPeriod(): AvailabilityPeriod | null {
    this.clearFeedback();
    const startDate = this.startDateInput?.trim();
    const endDate = this.endDateInput?.trim();

    if (!startDate || !endDate) {
      this.errorMessage = 'Debes seleccionar la fecha de inicio y la fecha de fin.';
      return null;
    }

    const today = this.getTodayString();

    // CA2: Dado que el periodo termina antes de empezar o comienza en el pasado, el sistema lo rechaza.
    if (endDate <= startDate) {
      this.errorMessage = 'El periodo fue rechazado: la fecha de fin debe ser posterior a la fecha de inicio.';
      return null;
    }

    if (startDate < today) {
      this.errorMessage = 'El periodo fue rechazado: la fecha de inicio no puede comenzar en el pasado.';
      return null;
    }

    // CA3: Dado que el periodo se superpone con otro ya registrado, el sistema lo rechaza e indica el periodo existente.
    const overlapping = this.selectedListingPeriods.find(
      (existing) => startDate <= existing.endDate && endDate >= existing.startDate,
    );

    if (overlapping) {
      this.errorMessage = `El periodo se superpone con el periodo existente del ${overlapping.startDate} al ${overlapping.endDate}.`;
      return null;
    }

    // CA1: El periodo queda disponible para reservas.
    const created: AvailabilityPeriod = {
      id: `period-${this.periods.length + 1}`,
      listingId: this.selectedListingId,
      startDate,
      endDate,
      availableForBooking: true,
      createdAt: new Date().toISOString(),
    };

    this.periods.push(created);
    this.successMessage = `Periodo del ${startDate} al ${endDate} registrado y disponible para reservas.`;
    this.startDateInput = '';
    this.endDateInput = '';
    return created;
  }
}
