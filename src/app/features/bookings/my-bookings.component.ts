import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Booking, BookingStatus } from '../../shared/models/booking.model';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="bookings-shell">
      <header class="bookings-header">
        <div class="header-content">
          <span class="eyebrow">Portal del Huésped · Inversiones LR</span>
          <h1>Mis Reservas &amp; Estancias</h1>
          <p class="subtitle">
            Consulta el historial de tus reservas, verifica el desglose de cotización en COP (RF-047),
            gestiona cancelaciones con política transparente (RF-053) y califica estancias completadas (RF-063).
          </p>
        </div>

        <div class="header-metrics">
          <div class="metric-pill">
            <span class="metric-num">{{ bookings.length }}</span>
            <span class="metric-label">Total Reservas</span>
          </div>
          <div class="metric-pill active">
            <span class="metric-num">{{ countByStatus('CONFIRMADA') }}</span>
            <span class="metric-label">Confirmadas</span>
          </div>
        </div>
      </header>

      <!-- Mensajes de feedback -->
      <div *ngIf="feedbackMessage" class="feedback-banner" [class.error]="feedbackIsError" role="alert">
        {{ feedbackMessage }}
      </div>

      <!-- Barra de filtros por estado y buscador (RF-048 / RNF-022) -->
      <div class="filter-toolbar">
        <div class="status-pills" role="tablist" aria-label="Filtro por estado de reserva">
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedStatus === 'TODAS'"
            (click)="setStatusFilter('TODAS')"
          >
            Todas ({{ bookings.length }})
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedStatus === 'CONFIRMADA'"
            (click)="setStatusFilter('CONFIRMADA')"
          >
            Confirmadas ({{ countByStatus('CONFIRMADA') }})
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedStatus === 'PENDIENTE_APROBACION'"
            (click)="setStatusFilter('PENDIENTE_APROBACION')"
          >
            Pendientes ({{ countByStatus('PENDIENTE_APROBACION') }})
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedStatus === 'EN_REVISION'"
            (click)="setStatusFilter('EN_REVISION')"
          >
            En Revisión ({{ countByStatus('EN_REVISION') }})
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedStatus === 'COMPLETADA'"
            (click)="setStatusFilter('COMPLETADA')"
          >
            Completadas ({{ countByStatus('COMPLETADA') }})
          </button>
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedStatus === 'CANCELADA'"
            (click)="setStatusFilter('CANCELADA')"
          >
            Canceladas ({{ countByStatus('CANCELADA') }})
          </button>
        </div>

        <div class="search-box">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Buscar por ID o ciudad..."
            class="search-input"
          />
        </div>
      </div>

      <!-- Listado de tarjetas de reserva -->
      <div class="bookings-grid" *ngIf="paginatedBookings.length > 0">
        <article *ngFor="let item of paginatedBookings" class="booking-card" [class.cancelled]="item.status === 'CANCELADA'">
          <div class="card-media" [style.background-image]="'url(' + (item.imageUrl || defaultImage) + ')'">
            <span class="status-tag" [ngClass]="item.status.toLowerCase()">
              {{ item.status }}
            </span>
            <span class="card-id">{{ item.id }}</span>
          </div>

          <div class="card-body">
            <div class="card-header">
              <div>
                <span class="city-label">{{ item.listingCity }}</span>
                <h3>{{ item.listingTitle }}</h3>
              </div>
              <div class="total-badge">
                <span class="total-label">Total en COP</span>
                <span class="total-amount">\${{ item.total | number:'1.0-0' }} COP</span>
              </div>
            </div>

            <div class="dates-grid">
              <div class="date-item">
                <span class="date-caption">Check-in</span>
                <strong>{{ item.checkIn }}</strong>
              </div>
              <div class="date-item">
                <span class="date-caption">Check-out</span>
                <strong>{{ item.checkOut }}</strong>
              </div>
              <div class="date-item">
                <span class="date-caption">Estancia</span>
                <strong>{{ item.nights }} noches</strong>
              </div>
              <div class="date-item">
                <span class="date-caption">Huéspedes</span>
                <strong>{{ item.guests }} personas</strong>
              </div>
            </div>

            <!-- Desglose de cotización (RF-047 / RF-038) -->
            <div class="financial-breakdown">
              <span class="breakdown-title">Desglose de cotización:</span>
              <div class="breakdown-row">
                <span>{{ item.nights }} noches × \${{ item.nightlyRate | number:'1.0-0' }}</span>
                <span>\${{ item.baseAmount | number:'1.0-0' }} COP</span>
              </div>
              <div class="breakdown-row">
                <span>Tarifa de limpieza</span>
                <span>\${{ item.cleaningFee | number:'1.0-0' }} COP</span>
              </div>
              <div class="breakdown-row">
                <span>Comisión de servicio Inversiones LR</span>
                <span>\${{ item.serviceFee | number:'1.0-0' }} COP</span>
              </div>
            </div>

            <!-- Información según estado -->
            <div *ngIf="item.status === 'EN_REVISION'" class="info-notice revision">
              <strong>En revisión administrativa (RN-020):</strong> La publicación asociada está bajo inspección. Tu reserva se conserva activa mientras el administrador la resuelve (RF-069).
            </div>

            <div *ngIf="item.status === 'PENDIENTE_APROBACION'" class="info-notice pending">
              <strong>Esperando aprobación (RF-050):</strong> El anfitrión está revisando tu solicitud.
            </div>

            <div *ngIf="item.status === 'CANCELADA'" class="info-notice cancelled">
              <strong>Cancelada el {{ item.cancelledAt || 'Recientemente' }}:</strong> Motivo: {{ item.cancellationReason || 'Solicitado por el usuario' }}.
              <span *ngIf="item.refundAmount !== undefined"> Devolución simulada: <strong>\${{ item.refundAmount | number:'1.0-0' }} COP</strong></span>
            </div>

            <!-- Calificación de estancia completada (RF-063) -->
            <div *ngIf="item.status === 'COMPLETADA'" class="review-box">
              <div *ngIf="!item.rating; else reviewDone">
                <span class="review-title">Calificar y reseñar estancia (RF-063):</span>
                <div class="star-rating">
                  <button
                    *ngFor="let star of [1,2,3,4,5]"
                    type="button"
                    class="star-btn"
                    [class.filled]="(tempRatings[item.id] || 0) >= star"
                    (click)="setTempRating(item.id, star)"
                  >
                    ★
                  </button>
                  <span class="rating-text" *ngIf="tempRatings[item.id]">
                    {{ tempRatings[item.id] }} de 5 estrellas
                  </span>
                </div>
                <textarea
                  class="review-input"
                  rows="2"
                  [(ngModel)]="tempComments[item.id]"
                  placeholder="Escribe tu reseña para la comunidad..."
                ></textarea>
                <div class="review-actions">
                  <button type="button" class="action-btn primary small" (click)="submitReview(item)">
                    Publicar Reseña
                  </button>
                </div>
              </div>
              <ng-template #reviewDone>
                <div class="submitted-review">
                  <span class="star-display">★ {{ item.rating }}.0</span>
                  <p class="review-text">"{{ item.reviewComment }}"</p>
                  <span class="review-meta">Reseña verificada y publicada</span>
                </div>
              </ng-template>
            </div>

            <!-- Botones de acción -->
            <div class="card-actions">
              <button
                *ngIf="item.status === 'CONFIRMADA'"
                type="button"
                class="action-btn danger"
                (click)="openCancellationModal(item)"
              >
                Cancelar Reserva (RF-053)
              </button>

              <button
                *ngIf="item.status === 'PENDIENTE_APROBACION'"
                type="button"
                class="action-btn secondary"
                (click)="cancelPendingBooking(item)"
              >
                Retirar Solicitud
              </button>

              <button
                type="button"
                class="action-btn secondary"
                (click)="showVoucherMessage(item.id)"
              >
                Comprobante
              </button>
            </div>
          </div>
        </article>
      </div>

      <!-- Estado vacío -->
      <div class="empty-state" *ngIf="paginatedBookings.length === 0">
        <h3>No se encontraron reservas</h3>
        <p>No hay reservas que coincidan con el estado seleccionado o término de búsqueda.</p>
      </div>

      <!-- Paginación obligatoria (RNF-022 / RF-048) -->
      <footer class="pagination-bar" *ngIf="filteredBookings.length > 0">
        <div class="pagination-info">
          Mostrando {{ (currentPage - 1) * pageSize + 1 }} a
          {{ min(currentPage * pageSize, filteredBookings.length) }} de
          {{ filteredBookings.length }} reservas
        </div>

        <div class="pagination-controls">
          <button
            type="button"
            class="page-btn"
            [disabled]="currentPage === 1"
            (click)="goToPage(currentPage - 1)"
          >
            Anterior
          </button>
          <span class="page-indicator">Página {{ currentPage }} de {{ totalPages }}</span>
          <button
            type="button"
            class="page-btn"
            [disabled]="currentPage === totalPages"
            (click)="goToPage(currentPage + 1)"
          >
            Siguiente
          </button>
        </div>
      </footer>

      <!-- Modal de Cancelación (RF-053 / RF-054 / RF-056 / RF-058) -->
      <div class="modal-backdrop" *ngIf="cancellingBooking">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Cancelar Reserva {{ cancellingBooking.id }}</h3>
            <button type="button" class="close-btn" (click)="closeCancellationModal()">✕</button>
          </div>

          <div class="modal-body">
            <p>
              Estás a punto de cancelar tu reserva en <strong>{{ cancellingBooking.listingTitle }}</strong>.
              Según la <strong>Política {{ cancellingBooking.cancellationPolicy }} (RF-058)</strong>,
              la tarifa de servicio no es reembolsable.
            </p>

            <div class="refund-calc">
              <div class="calc-row">
                <span>Total pagado:</span>
                <span>\${{ cancellingBooking.total | number:'1.0-0' }} COP</span>
              </div>
              <div class="calc-row fee">
                <span>Tarifa de servicio retenida:</span>
                <span>-\${{ cancellingBooking.serviceFee | number:'1.0-0' }} COP</span>
              </div>
              <div class="calc-row total">
                <span>Devolución simulada (RF-054):</span>
                <strong>\${{ (cancellingBooking.total - cancellingBooking.serviceFee) | number:'1.0-0' }} COP</strong>
              </div>
            </div>

            <label class="input-label" for="cancel-reason">Motivo de cancelación (obligatorio según RF-053):</label>
            <select id="cancel-reason" [(ngModel)]="cancellationReason" class="select-input">
              <option value="Cambio imprevisto de itinerario">Cambio imprevisto de itinerario</option>
              <option value="Motivos médicos o de salud">Motivos médicos o de salud</option>
              <option value="Problemas de transporte o vuelos">Problemas de transporte o vuelos</option>
              <option value="Otro motivo personal">Otro motivo personal</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" class="action-btn secondary" (click)="closeCancellationModal()">
              Volver
            </button>
            <button type="button" class="action-btn danger" (click)="confirmCancellation()">
              Confirmar Cancelación y Devolución
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .bookings-shell {
        max-width: 1200px;
        margin: 0 auto;
        padding: 3rem 1.5rem 5rem;
        color: #1d1d1f;
      }
      .bookings-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 2rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
      }
      .eyebrow {
        display: block;
        font-size: 0.8125rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #0071e3;
        margin-bottom: 0.5rem;
      }
      h1 {
        font-size: 2.25rem;
        font-weight: 700;
        letter-spacing: -0.025em;
        margin: 0 0 0.5rem;
      }
      .subtitle {
        font-size: 1rem;
        line-height: 1.5;
        color: #6e6e73;
        max-width: 650px;
        margin: 0;
      }
      .header-metrics {
        display: flex;
        gap: 1rem;
      }
      .metric-pill {
        background: #f5f5f7;
        padding: 0.75rem 1.25rem;
        border-radius: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 90px;
      }
      .metric-pill.active {
        background: #e8f3ff;
        color: #0071e3;
      }
      .metric-num {
        font-size: 1.5rem;
        font-weight: 700;
        line-height: 1;
      }
      .metric-label {
        font-size: 0.75rem;
        color: #6e6e73;
        margin-top: 0.25rem;
      }
      .feedback-banner {
        background: #e8f5e9;
        color: #1b5e20;
        padding: 0.875rem 1.25rem;
        border-radius: 0.75rem;
        margin-bottom: 1.5rem;
        font-size: 0.9375rem;
        font-weight: 500;
      }
      .feedback-banner.error {
        background: #ffebee;
        color: #c62828;
      }
      .filter-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
      }
      .status-pills {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .pill-btn {
        background: #f5f5f7;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 500;
        color: #1d1d1f;
        cursor: pointer;
        transition: all 0.2s;
      }
      .pill-btn:hover {
        background: #e8e8ed;
      }
      .pill-btn.active {
        background: #1d1d1f;
        color: #ffffff;
      }
      .search-box {
        flex-shrink: 0;
      }
      .search-input {
        background: #f5f5f7;
        border: 1px solid transparent;
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        outline: none;
        width: 240px;
        transition: all 0.2s;
      }
      .search-input:focus {
        background: #ffffff;
        border-color: #0071e3;
        box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15);
      }
      .bookings-grid {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .booking-card {
        background: #ffffff;
        border: 1px solid #e5e5ea;
        border-radius: 1.25rem;
        display: flex;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        transition: box-shadow 0.2s;
      }
      .booking-card:hover {
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
      }
      .booking-card.cancelled {
        opacity: 0.85;
        background: #fafafc;
      }
      .card-media {
        width: 320px;
        background-size: cover;
        background-position: center;
        position: relative;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .status-tag {
        align-self: flex-start;
        padding: 0.35rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px);
      }
      .status-tag.confirmada {
        color: #1b5e20;
      }
      .status-tag.pendiente_aprobacion {
        color: #b78103;
      }
      .status-tag.en_revision {
        color: #6a1b9a;
      }
      .status-tag.completada {
        color: #0d47a1;
      }
      .status-tag.cancelada {
        color: #b71c1c;
      }
      .card-id {
        align-self: flex-start;
        font-size: 0.75rem;
        font-family: monospace;
        font-weight: 600;
        background: rgba(0, 0, 0, 0.6);
        color: #ffffff;
        padding: 0.25rem 0.5rem;
        border-radius: 0.5rem;
      }
      .card-body {
        padding: 1.5rem;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
      }
      .city-label {
        font-size: 0.8125rem;
        color: #6e6e73;
        text-transform: uppercase;
        font-weight: 600;
      }
      .card-header h3 {
        margin: 0.25rem 0 0;
        font-size: 1.25rem;
        font-weight: 600;
      }
      .total-badge {
        text-align: right;
      }
      .total-label {
        display: block;
        font-size: 0.75rem;
        color: #6e6e73;
      }
      .total-amount {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0071e3;
      }
      .dates-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        background: #f5f5f7;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        gap: 0.5rem;
      }
      .date-item {
        display: flex;
        flex-direction: column;
      }
      .date-caption {
        font-size: 0.75rem;
        color: #6e6e73;
      }
      .financial-breakdown {
        background: #fafafc;
        border: 1px solid #ebebf0;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        font-size: 0.8125rem;
      }
      .breakdown-title {
        font-weight: 600;
        color: #6e6e73;
        margin-bottom: 0.35rem;
        display: block;
      }
      .breakdown-row {
        display: flex;
        justify-content: space-between;
        color: #3a3a3c;
        margin-top: 0.25rem;
      }
      .info-notice {
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        font-size: 0.875rem;
      }
      .info-notice.revision {
        background: #f3e5f5;
        color: #4a148c;
      }
      .info-notice.pending {
        background: #fff8e1;
        color: #f57f17;
      }
      .info-notice.cancelled {
        background: #ffebee;
        color: #b71c1c;
      }
      .review-box {
        background: #f5f5f7;
        padding: 1rem;
        border-radius: 0.75rem;
      }
      .review-title {
        font-size: 0.875rem;
        font-weight: 600;
        display: block;
        margin-bottom: 0.5rem;
      }
      .star-rating {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        margin-bottom: 0.5rem;
      }
      .star-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #d1d1d6;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      .star-btn.filled {
        color: #ff9500;
      }
      .rating-text {
        font-size: 0.8125rem;
        color: #6e6e73;
        margin-left: 0.5rem;
      }
      .review-input {
        width: 100%;
        box-sizing: border-box;
        padding: 0.5rem;
        border-radius: 0.5rem;
        border: 1px solid #d1d1d6;
        font-family: inherit;
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
      }
      .submitted-review {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .star-display {
        font-weight: 700;
        color: #ff9500;
      }
      .review-text {
        font-style: italic;
        margin: 0;
        font-size: 0.875rem;
      }
      .review-meta {
        font-size: 0.75rem;
        color: #1b5e20;
        font-weight: 600;
      }
      .card-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: auto;
      }
      .action-btn {
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .action-btn.primary {
        background: #0071e3;
        color: #ffffff;
      }
      .action-btn.primary:hover {
        background: #0077ed;
      }
      .action-btn.danger {
        background: #ff3b30;
        color: #ffffff;
      }
      .action-btn.danger:hover {
        background: #e02d23;
      }
      .action-btn.secondary {
        background: #f5f5f7;
        color: #1d1d1f;
      }
      .action-btn.secondary:hover {
        background: #e8e8ed;
      }
      .action-btn.small {
        padding: 0.35rem 0.75rem;
        font-size: 0.8125rem;
      }
      .empty-state {
        text-align: center;
        padding: 4rem 1rem;
        background: #f5f5f7;
        border-radius: 1rem;
      }
      .pagination-bar {
        margin-top: 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 0;
        border-top: 1px solid #e5e5ea;
        font-size: 0.875rem;
        color: #6e6e73;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .page-btn {
        background: #f5f5f7;
        border: none;
        padding: 0.4rem 0.85rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        cursor: pointer;
      }
      .page-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      /* Modal */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }
      .modal-card {
        background: #ffffff;
        border-radius: 1.25rem;
        max-width: 500px;
        width: 100%;
        padding: 1.5rem;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      }
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .modal-header h3 {
        margin: 0;
        font-size: 1.25rem;
      }
      .close-btn {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        color: #6e6e73;
      }
      .refund-calc {
        background: #f5f5f7;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        margin: 1rem 0;
        font-size: 0.875rem;
      }
      .calc-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.25rem;
      }
      .calc-row.fee {
        color: #ff3b30;
      }
      .calc-row.total {
        font-weight: 700;
        color: #1b5e20;
        padding-top: 0.5rem;
        border-top: 1px solid #e5e5ea;
        margin-top: 0.5rem;
      }
      .input-label {
        font-size: 0.8125rem;
        font-weight: 600;
        display: block;
        margin-bottom: 0.35rem;
      }
      .select-input {
        width: 100%;
        padding: 0.6rem;
        border-radius: 0.5rem;
        border: 1px solid #d1d1d6;
        font-size: 0.875rem;
        background: #ffffff;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
      }
      @media (max-width: 768px) {
        .booking-card {
          flex-direction: column;
        }
        .card-media {
          width: 100%;
          height: 200px;
        }
        .dates-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `,
  ],
})
export class MyBookingsComponent {
  defaultImage =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDBzLb4D0hXTtv94YgrWMhNgADYVAoLJcmapt80ln2soBQUUBy3oShdBd4G1QtRCxOjFmc57ejII1muyXGvGVLKcAY5w0xes8kqHdV_mRJ30LorfhTepvJyN0pQd2arlng8xqWXsQ8bEvxzpDRaJr2Z5BMkb7E3yt4oPZZ4bo4xytWiDYdJ68OOK7vGg_7GXuRjvSk9WOP4JawgX_ezJSmmpqi-bc_UXmWQKrH5rR_rNYdVAxfqqt7q';


  selectedStatus: 'TODAS' | BookingStatus = 'TODAS';
  searchQuery = '';
  feedbackMessage = '';
  feedbackIsError = false;

  // Pagination (RNF-022)
  currentPage = 1;
  pageSize = 5;

  // Interactive Reviews
  tempRatings: Record<string, number> = {};
  tempComments: Record<string, string> = {};

  // Cancellation Modal
  cancellingBooking: Booking | null = null;
  cancellationReason = 'Cambio imprevisto de itinerario';

  bookings: Booking[] = [
    {
      id: 'LR-RSV-2026-8812',
      listingId: 'listing-cartagena-1',
      listingTitle: 'Villa Solarium & Spa privada frente al mar',
      listingCity: 'Cartagena',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDBzLb4D0hXTtv94YgrWMhNgADYVAoLJcmapt80ln2soBQUUBy3oShdBd4G1QtRCxOjFmc57ejII1muyXGvGVLKcAY5w0xes8kqHdV_mRJ30LorfhTepvJyN0pQd2arlng8xqWXsQ8bEvxzpDRaJr2Z5BMkb7E3yt4oPZZ4bo4xytWiDYdJ68OOK7vGg_7GXuRjvSk9WOP4JawgX_ezJSmmpqi-bc_UXmWQKrH5rR_rNYdVAxfqqt7q',
      guestId: 'guest-me',
      guestName: 'Miguel A.',
      hostName: 'Carlos Restrepo',
      checkIn: '2026-11-10',
      checkOut: '2026-11-14',
      nights: 4,
      guests: 4,
      nightlyRate: 850000,
      baseAmount: 3400000,
      cleaningFee: 180000,
      serviceFee: 252000,
      total: 3832000,
      status: 'CONFIRMADA',
      cancellationPolicy: 'Flexible',
    },
    {
      id: 'LR-RSV-2026-9102',
      listingId: 'listing-medellin-1',
      listingTitle: 'Penthouse Panorámico con Jacuzzi',
      listingCity: 'Medellín',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD5n6vcB5gNZemJWNhs1lAt6A282zkV-lPp9N9UKtrrwK58aKy0Hz4WMibtwnr06yR6HPl6v49gbZVrIQzFer6xDhmtYLluVB8zxvitTZ7ILuQ0xl2uPQjmigRowQuqQDHtXO61AbqR2zDYMFv_cbJuDkoVxBSvE2hzoRyz5f8-7Oq-_1bnBj66IgZFhxXglIb67fLGgXb_K3wZcTTKidGVc-BkvoVBbDkyWkyLIfxPBL88vvHqUXXo',
      guestId: 'guest-me',
      guestName: 'Miguel A.',
      hostName: 'Laura Restrepo',
      checkIn: '2026-11-20',
      checkOut: '2026-11-24',
      nights: 4,
      guests: 2,
      nightlyRate: 650000,
      baseAmount: 2600000,
      cleaningFee: 120000,
      serviceFee: 170000,
      total: 2890000,
      status: 'PENDIENTE_APROBACION',
      cancellationPolicy: 'Flexible',
    },
    {
      id: 'LR-RSV-2026-9240',
      listingId: 'listing-santamarta-1',
      listingTitle: 'Suite Esmeralda Frente a la Playa',
      listingCity: 'Santa Marta',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBthlHtuo1QMEL31CZM-R0fbvFhD1y5L1S-Fin-4zVxovath7pP0G4z7MMMDFvoo39_I99FCQMjBpmGl4ocNSdKbJD3TMn5bc1uzCrUaFK22XzA80PZnJ1AAusSK7F45eb2oEDJc_Jo_RAqyLrR7oLBj2LN11P0ZuTGZDlHA98dACkBPKhIAAOrNWklhhk8UzVJb7LgSARhJKDvLt2y0SK4aPf0U85lvKdd6-_m7wdV0bfZFUEUJSWM',
      guestId: 'guest-me',
      guestName: 'Miguel A.',
      hostName: 'Andrés Salgado',
      checkIn: '2026-12-01',
      checkOut: '2026-12-06',
      nights: 5,
      guests: 3,
      nightlyRate: 550000,
      baseAmount: 2750000,
      cleaningFee: 150000,
      serviceFee: 250000,
      total: 3150000,
      status: 'EN_REVISION',
      cancellationPolicy: 'Flexible',
    },
    {
      id: 'LR-RSV-2026-7201',
      listingId: 'listing-leyva-1',
      listingTitle: 'Finca Boutique Valle de Leyva',
      listingCity: 'Villa de Leyva',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBH5qtkNm0qHPGUpaVtqbt7qlrSvEiXCFGY5vjjxvYe8BzaTBbX4vZhLnBZ7jGeA2L0apgEeaQVE7Vd0WS34oFMvruMUbdQHousRPCek5L6BXGk0BgLkbo8DFOo3dIhjG0r6koS_A2pkc5dGrqIrWw_0aAK8EO-q-0Efl4RBNeQK3SBbxqzlQE00LqFN8T4hg-8F0FwO1se9dRsCw1-oqMJ5J08oFZGYSxYlvQvewMmm_ZxU_bxq-6R',
      guestId: 'guest-me',
      guestName: 'Miguel A.',
      hostName: 'Beatriz Gómez',
      checkIn: '2026-10-01',
      checkOut: '2026-10-04',
      nights: 3,
      guests: 4,
      nightlyRate: 600000,
      baseAmount: 1800000,
      cleaningFee: 150000,
      serviceFee: 200000,
      total: 2150000,
      status: 'COMPLETADA',
      cancellationPolicy: 'Flexible',
    },
    {
      id: 'LR-RSV-2026-6410',
      listingId: 'listing-bogota-1',
      listingTitle: 'Apartamento Loft Contemporáneo Usaquén',
      listingCity: 'Bogotá',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD5n6vcB5gNZemJWNhs1lAt6A282zkV-lPp9N9UKtrrwK58aKy0Hz4WMibtwnr06yR6HPl6v49gbZVrIQzFer6xDhmtYLluVB8zxvitTZ7ILuQ0xl2uPQjmigRowQuqQDHtXO61AbqR2zDYMFv_cbJuDkoVxBSvE2hzoRyz5f8-7Oq-_1bnBj66IgZFhxXglIb67fLGgXb_K3wZcTTKidGVc-BkvoVBbDkyWkyLIfxPBL88vvHqUXXo',
      guestId: 'guest-me',
      guestName: 'Miguel A.',
      hostName: 'Carlos Mendoza',
      checkIn: '2026-09-12',
      checkOut: '2026-09-15',
      nights: 3,
      guests: 2,
      nightlyRate: 500000,
      baseAmount: 1500000,
      cleaningFee: 150000,
      serviceFee: 200000,
      total: 1850000,
      status: 'CANCELADA',
      cancellationPolicy: 'Flexible',
      cancelledAt: '2026-09-08',
      cancellationReason: 'Cambio imprevisto de itinerario',
      refundAmount: 1650000,
    },
  ];

  countByStatus(status: BookingStatus): number {
    return this.bookings.filter((b) => b.status === status).length;
  }

  setStatusFilter(status: 'TODAS' | BookingStatus): void {
    this.selectedStatus = status;
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  get filteredBookings(): Booking[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.bookings.filter((item) => {
      const matchStatus =
        this.selectedStatus === 'TODAS' || item.status === this.selectedStatus;
      const matchQuery =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.listingCity.toLowerCase().includes(q) ||
        item.listingTitle.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredBookings.length / this.pageSize));
  }

  get paginatedBookings(): Booking[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredBookings.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Cancelación modal (RF-053 / RF-054 / RF-058)
  openCancellationModal(booking: Booking): void {
    this.cancellingBooking = booking;
  }

  closeCancellationModal(): void {
    this.cancellingBooking = null;
  }

  confirmCancellation(): void {
    if (!this.cancellingBooking) return;
    const b = this.cancellingBooking;
    const refund = b.total - b.serviceFee;
    b.status = 'CANCELADA';
    b.cancellationReason = this.cancellationReason;
    b.cancelledAt = new Date().toISOString().split('T')[0];
    b.refundAmount = refund;

    this.feedbackMessage = `Reserva ${b.id} cancelada exitosamente. Se liberó el periodo (RF-055) y se procesó la devolución simulada por $${refund.toLocaleString('es-CO')} COP (RF-054).`;
    this.feedbackIsError = false;
    this.closeCancellationModal();
  }

  cancelPendingBooking(booking: Booking): void {
    booking.status = 'CANCELADA';
    booking.cancellationReason = 'Solicitud retirada por el huésped';
    booking.cancelledAt = new Date().toISOString().split('T')[0];
    booking.refundAmount = 0;
    this.feedbackMessage = `Solicitud de reserva ${booking.id} retirada correctamente.`;
    this.feedbackIsError = false;
  }

  // Reviews (RF-063)
  setTempRating(bookingId: string, rating: number): void {
    this.tempRatings[bookingId] = rating;
  }

  submitReview(booking: Booking): void {
    const rating = this.tempRatings[booking.id];
    const comment = (this.tempComments[booking.id] || '').trim();

    if (!rating) {
      this.feedbackMessage = 'Por favor selecciona una calificación de 1 a 5 estrellas.';
      this.feedbackIsError = true;
      return;
    }
    if (!comment) {
      this.feedbackMessage = 'Por favor escribe un comentario de reseña.';
      this.feedbackIsError = true;
      return;
    }

    booking.rating = rating;
    booking.reviewComment = comment;
    booking.reviewedAt = new Date().toISOString().split('T')[0];

    this.feedbackMessage = `¡Gracias! Reseña y calificación de ${rating} estrellas registradas para ${booking.id} (RF-064).`;
    this.feedbackIsError = false;
  }

  showVoucherMessage(bookingId: string): void {
    this.feedbackMessage = `Descargando comprobante oficial para la reserva ${bookingId} (PDF)...`;
    this.feedbackIsError = false;
  }
}
