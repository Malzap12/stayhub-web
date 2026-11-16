import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import { formatQuoteAmount } from '../listings/stay-quote.component';
import { StatusLabelPipe } from '../../shared/models/display.model';
import { MAX_MESSAGE_LENGTH, validateMessageText } from '../../shared/models/messages.model';
import {
  decisionErrorMessage,
  cancelHostBookingRequest,
  canHostCancelBooking,
  formatCancellationDate,
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
 * HU-036 · Si es una solicitud por aprobar, el anfitrión la acepta (se cobra y queda confirmada) o la rechaza.
 * HU-042 · El anfitrión cancela una reserva confirmada con devolución del 100 % del total.
 */
@Component({
  selector: 'app-host-booking-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, StatusLabelPipe],
  template: `
    <section class="detail-shell">
      <a routerLink="/anfitrion/reservas" class="back">← Reservas recibidas</a>

      <p *ngIf="loading" class="note">Cargando la reserva…</p>
      <div *ngIf="errorMessage" class="error" role="alert">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="success" role="status">{{ successMessage }}</div>

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

        <div class="decision-result failure" *ngIf="decisionError" role="alert">{{ decisionError }}</div>

        <!-- HU-036: el anfitrión acepta o rechaza la solicitud -->
        <article class="decision" *ngIf="b.status === 'PENDIENTE_APROBACION'" aria-label="Decidir la solicitud">
          <h2>¿Aceptas esta solicitud?</h2>
          <p>
            Si la aceptas, revisamos que las fechas sigan libres y cobramos {{ money(b.totalAmount) }} {{ b.currency }} a la tarjeta del huésped<span
              *ngIf="b.paymentCard"> ({{ b.paymentCard }})</span>. Si la rechazas, no se cobra nada y le avisamos al huésped.
          </p>
          <div class="decision-actions" *ngIf="!rejecting">
            <button type="button" class="accept-btn" (click)="accept()" [disabled]="deciding">
              {{ deciding ? 'Procesando…' : 'Aceptar y cobrar' }}
            </button>
            <button type="button" class="reject-btn" (click)="startRejecting()" [disabled]="deciding">Rechazar</button>
          </div>
          <div class="reject-form" *ngIf="rejecting">
            <label for="reject-reason">Motivo para el huésped (opcional)</label>
            <textarea id="reject-reason" rows="3" maxlength="300" [(ngModel)]="rejectReason"
              placeholder="Por ejemplo: esas fechas no recibo huéspedes."></textarea>
            <small class="counter">{{ rejectReason.length }}/300</small>
            <div class="decision-actions">
              <button type="button" class="reject-btn solid" (click)="reject()" [disabled]="deciding">
                {{ deciding ? 'Rechazando…' : 'Rechazar solicitud' }}
              </button>
              <button type="button" class="link-btn" (click)="rejecting = false" [disabled]="deciding">Volver</button>
            </div>
          </div>
        </article>

        <p class="rejection" *ngIf="b.status === 'RECHAZADA' && b.rejectionReason">
          Motivo que le diste al huésped: «{{ b.rejectionReason }}»
        </p>

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

          <article class="card cancellation-detail-card" *ngIf="b.cancellation as c">
            <h2>Detalle de la cancelación</h2>
            <p class="cancel-meta">Registrada el {{ cancellationDate(c.cancelledAt) }}</p>
            <dl>
              <div><dt>Motivo</dt><dd>{{ c.reason }}</dd></div>
              <div><dt>Devolución simulada</dt><dd>{{ money(c.refundAmount) }} {{ c.currency }} ({{ c.refundPercentage }} %)</dd></div>
            </dl>
            <p class="hint cancel-rule">{{ c.appliedRule }}</p>
          </article>
        </div>

        <article class="card message-guest-card">
          <div class="cancel-header">
            <div>
              <h2>Mensajes con el huésped</h2>
              <p class="hint">
                Escribe a {{ b.guestName }} sobre esta reserva sin compartir datos de contacto externos.
              </p>
            </div>
            <button
              *ngIf="existingConversationId"
              type="button"
              class="btn secondary"
              (click)="openConversation(existingConversationId)"
            >
              Ver conversación
            </button>
          </div>
          <div class="cancel-form">
            <label for="host-guest-message" class="field-label">Mensaje para {{ b.guestName }}</label>
            <textarea
              id="host-guest-message"
              class="reason-input"
              rows="3"
              [attr.maxlength]="maxMessageLength + 10"
              [(ngModel)]="hostMessage"
              (ngModelChange)="onHostMessageChange()"
              placeholder="Escribe un mensaje para coordinar dudas de la estancia…"
              [disabled]="sendingHostMessage"
            ></textarea>
            <div class="form-actions" style="justify-content: space-between; align-items: center;">
              <small class="counter">{{ hostMessage.length }}/{{ maxMessageLength }}</small>
              <button
                type="button"
                class="accept-btn"
                [disabled]="sendingHostMessage"
                (click)="sendHostMessage()"
              >
                {{ sendingHostMessage ? 'Enviando…' : 'Enviar mensaje' }}
              </button>
            </div>
            <p *ngIf="hostMessageValidationError" class="inline-error" role="alert">{{ hostMessageValidationError }}</p>
            <p *ngIf="hostMessageServerError" class="inline-error" role="alert">{{ hostMessageServerError }}</p>
            <p *ngIf="hostMessageSentOk" class="success" role="status" style="margin-top: 0.75rem;">
              Mensaje enviado al huésped.
              <a [routerLink]="['/mensajes', existingConversationId || '']" class="back" style="margin-left: 8px;">Abrir conversación</a>
            </p>
          </div>
        </article>

        <article class="card cancel-action-card" *ngIf="b.status === 'CONFIRMADA'">
          <ng-container *ngIf="canCancel(b); else arrivalPassed">
            <div class="cancel-header">
              <div>
                <h2>¿No puedes cumplir esta reserva?</h2>
                <p class="hint">
                  Al cancelar se notificará al huésped, se procesará la devolución simulada del 100 % del total
                  (<strong>{{ money(b.totalAmount) }} {{ b.currency }}</strong>) y las noches volverán a estar disponibles.
                </p>
              </div>
              <button
                *ngIf="!cancellingOpen"
                type="button"
                class="btn danger"
                (click)="openCancelForm()"
              >
                Cancelar reserva
              </button>
            </div>

            <div class="cancel-form" *ngIf="cancellingOpen">
              <label for="host-cancel-reason" class="field-label">Motivo de la cancelación</label>
              <textarea
                id="host-cancel-reason"
                class="reason-input"
                rows="3"
                maxlength="500"
                [(ngModel)]="cancelReason"
                placeholder="Explica al huésped por qué no puedes recibirlo en estas fechas…"
              ></textarea>
              <p *ngIf="cancelError" class="inline-error" role="alert">{{ cancelError }}</p>
              <div class="form-actions">
                <button type="button" class="btn secondary" [disabled]="submittingCancel" (click)="closeCancelForm()">
                  Volver
                </button>
                <button type="button" class="btn danger" [disabled]="submittingCancel" (click)="submitCancellation()">
                  {{ submittingCancel ? 'Cancelando…' : 'Confirmar cancelación' }}
                </button>
              </div>
            </div>
          </ng-container>
          <ng-template #arrivalPassed>
            <p class="hint">La fecha de llegada ya pasó; esta reserva no se puede cancelar.</p>
          </ng-template>
        </article>
      </ng-container>
    </section>
  `,
  styles: [
    `
      .detail-shell { max-width: 1000px; margin: 0 auto; padding: 2rem 1rem 4rem; }
      .back { color: #0071e3; text-decoration: none; font-weight: 600; }
      .note { color: #6e6e73; }
      .error { margin-top: 1.5rem; padding: 1rem 1.25rem; border-radius: 12px; background: #fdecec; color: #b42318; font-weight: 600; }
      .success { margin-top: 1.5rem; padding: 1rem 1.25rem; border-radius: 12px; background: #e8f7ee; color: #1a7f37; font-weight: 600; }
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
      .status.pendiente_aprobacion { background: #fff7e6; }
      .status.rechazada { background: #f5f5f7; }
      .decision { background: #fff; border: 1px solid #e5e5ea; border-radius: 16px; padding: 1.25rem; margin-bottom: 1.5rem; }
      .decision h2 { font-size: 1.05rem; margin: 0 0 0.5rem; }
      .decision p { margin: 0 0 1rem; color: #3a3a3c; }
      .decision-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
      .accept-btn, .reject-btn { min-height: 42px; padding: 0 1.25rem; border-radius: 980px; font: inherit; font-weight: 600; cursor: pointer; }
      .accept-btn { border: none; background: #1d1d1f; color: #fff; }
      .reject-btn { border: 1px solid #b42318; background: #fff; color: #b42318; }
      .reject-btn.solid { background: #b42318; color: #fff; }
      .accept-btn:disabled, .reject-btn:disabled, .link-btn:disabled { opacity: 0.6; cursor: progress; }
      .link-btn { border: none; background: none; color: #0071e3; font: inherit; font-weight: 600; cursor: pointer; }
      .reject-form { display: flex; flex-direction: column; gap: 0.5rem; }
      .reject-form label { font-weight: 600; }
      .reject-form textarea { width: 100%; box-sizing: border-box; padding: 0.6rem 0.75rem; border: 1px solid #d2d2d7; border-radius: 12px; font: inherit; resize: vertical; }
      .counter { color: #6e6e73; align-self: flex-end; }
      .decision-result { padding: 0.9rem 1.1rem; border-radius: 12px; margin-bottom: 1.25rem; font-weight: 600; }
      .decision-result.failure { background: #fdecec; color: #b42318; }
      .rejection { margin: 0 0 1.5rem; color: #3a3a3c; font-style: italic; overflow-wrap: anywhere; }
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
      .cancel-meta { color: #6e6e73; font-size: 0.85rem; margin: 0 0 0.75rem; }
      .cancel-rule { margin-top: 0.75rem; }
      .cancel-action-card { margin-top: 1.25rem; }
      .cancel-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
      .cancel-header h2 { margin-bottom: 0.35rem; }
      .cancel-form { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f0f0f2; }
      .field-label { display: block; font-size: 0.88rem; font-weight: 600; margin-bottom: 0.4rem; color: #1d1d1f; }
      .reason-input {
        width: 100%; box-sizing: border-box; padding: 0.65rem 0.85rem; border: 1px solid #d2d2d7;
        border-radius: 10px; font-family: inherit; font-size: 0.92rem; resize: vertical;
      }
      .inline-error { color: #b42318; font-size: 0.85rem; font-weight: 600; margin: 0.5rem 0 0; }
      .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.85rem; }
      .btn {
        padding: 0.55rem 1.1rem; border-radius: 980px; border: none; font-size: 0.88rem;
        font-weight: 600; cursor: pointer; white-space: nowrap;
      }
      .btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .btn.danger { background: #b42318; color: #fff; }
      .btn.secondary { background: #f5f5f7; color: #1d1d1f; }
      .message-guest-card { margin-top: 1.25rem; }
      @media (max-width: 600px) { .status { flex-direction: column; align-items: flex-start; } }
    `,
  ],
})
export class HostBookingDetailComponent implements OnInit {
  booking: HostBookingDetail | null = null;
  loading = false;
  errorMessage = '';
  /** HU-036: estado de la decisión sobre la solicitud. */
  deciding = false;
  rejecting = false;
  rejectReason = '';
  decisionError = '';
  successMessage = '';
  cancellingOpen = false;
  cancelReason = '';
  cancelError = '';
  submittingCancel = false;

  readonly maxMessageLength = MAX_MESSAGE_LENGTH;
  existingConversationId = '';
  hostMessage = '';
  hostMessageValidationError = '';
  hostMessageServerError = '';
  hostMessageSentOk = false;
  sendingHostMessage = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router?: Router,
  ) {}

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
        void this.lookupConversation(id, session.token);
      }
    } catch {
      this.errorMessage = 'Error de conexión al cargar la reserva.';
    } finally {
      this.loading = false;
    }
  }

  startRejecting(): void {
    this.rejecting = true;
    this.decisionError = '';
  }

  /** HU-036 CA1: se verifica la disponibilidad, se cobra el pago simulado y la reserva queda confirmada. */
  async accept(): Promise<void> {
    await this.decide('accept');
  }

  /** HU-036 CA2: la solicitud queda rechazada, sin cobro, y se avisa al huésped. */
  async reject(): Promise<void> {
    await this.decide('reject');
  }

  private async decide(action: 'accept' | 'reject'): Promise<void> {
    const booking = this.booking;
    const session = getActiveSession();
    if (!booking || !session) {
      this.decisionError = 'Inicia sesión como anfitrión para decidir esta solicitud.';
      return;
    }
    this.deciding = true;
    this.successMessage = '';
    this.decisionError = '';
    const reason = this.rejectReason.trim();
    try {
      const response = await fetch(`/api/bookings/host/${encodeURIComponent(booking.id)}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'reject' && reason ? { reason } : {}),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.decisionError = decisionErrorMessage(response.status, body);
        if (body?.reason === 'SOLICITUD_NO_PENDIENTE') {
          await this.load(booking.id);
        }
        return;
      }
      if (action === 'accept' && body?.payment?.status !== 'APROBADO') {
        this.decisionError =
          `El pago con la tarjeta del huésped fue rechazado${body?.payment?.message ? ` (${body.payment.message})` : ''}. ` +
          'La solicitud sigue pendiente y las fechas siguen libres; puedes rechazarla.';
        return;
      }
      this.successMessage =
        action === 'accept'
          ? 'Aceptaste la solicitud: el pago se aprobó y la reserva quedó confirmada.'
          : 'Rechazaste la solicitud. No se cobró nada y le avisamos al huésped.';
      this.rejecting = false;
      this.rejectReason = '';
      await this.load(booking.id);
    } catch {
      this.decisionError = 'Error de conexión. Intenta de nuevo.';
    } finally {
      this.deciding = false;
    }
  }

  canCancel(booking: HostBookingDetail): boolean {
    return canHostCancelBooking(booking);
  }

  openCancelForm(): void {
    this.cancellingOpen = true;
    this.cancelError = '';
    this.successMessage = '';
  }

  closeCancelForm(): void {
    this.cancellingOpen = false;
    this.cancelReason = '';
    this.cancelError = '';
  }

  async submitCancellation(): Promise<void> {
    if (!this.booking) return;
    const reason = this.cancelReason.trim();
    if (reason.length < 3) {
      this.cancelError = 'Indica el motivo de la cancelación (mínimo 3 caracteres).';
      return;
    }
    const session = getActiveSession();
    if (!session) {
      this.cancelError = 'Tu sesión expiró. Inicia sesión nuevamente como anfitrión.';
      return;
    }
    this.submittingCancel = true;
    this.cancelError = '';
    try {
      const result = await cancelHostBookingRequest(this.booking.id, reason, session.token);
      if (!result.ok) {
        this.cancelError = [result.body['message']].flat().filter(Boolean).join(' ') || 'No fue posible cancelar la reserva.';
        return;
      }
      this.booking = result.body as unknown as HostBookingDetail;
      this.cancellingOpen = false;
      this.cancelReason = '';
      this.successMessage =
        'La reserva quedó cancelada. Se notificó al huésped, se registró la devolución simulada del 100 % del total y las fechas volvieron a estar disponibles.';
    } catch {
      this.cancelError = 'Error de conexión al cancelar la reserva.';
    } finally {
      this.submittingCancel = false;
    }
  }

  statusNote(status: string): string {
    return hostStatusNote(status);
  }

  date(iso: string): string {
    return formatStayDate(iso);
  }

  cancellationDate(iso: string): string {
    return formatCancellationDate(iso);
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

  onHostMessageChange(): void {
    this.hostMessageServerError = '';
    this.hostMessageSentOk = false;
    if (this.hostMessageValidationError) {
      this.hostMessageValidationError = validateMessageText(this.hostMessage) ?? '';
    }
  }

  openConversation(conversationId: string): void {
    void this.router?.navigate(['/mensajes', conversationId]);
  }

  async sendHostMessage(): Promise<void> {
    if (!this.booking) return;
    const validationError = validateMessageText(this.hostMessage);
    if (validationError) {
      this.hostMessageValidationError = validationError;
      return;
    }

    const session = getActiveSession();
    if (!session) {
      this.hostMessageServerError = 'Tu sesión expiró. Inicia sesión nuevamente como anfitrión.';
      return;
    }

    this.sendingHostMessage = true;
    this.hostMessageValidationError = '';
    this.hostMessageServerError = '';
    this.hostMessageSentOk = false;

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: this.booking.id, content: this.hostMessage }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.hostMessageServerError =
          [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible enviar el mensaje.';
        return;
      }
      this.existingConversationId = body?.conversation?.id ?? this.existingConversationId;
      this.hostMessage = '';
      this.hostMessageSentOk = true;
    } catch {
      this.hostMessageServerError = 'Error de conexión al enviar el mensaje.';
    } finally {
      this.sendingHostMessage = false;
    }
  }

  private async lookupConversation(bookingId: string, token: string): Promise<void> {
    try {
      const response = await fetch(`/api/conversations/lookup?bookingId=${encodeURIComponent(bookingId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const body = (await response.json()) as { conversationId?: string | null };
      if (body?.conversationId) {
        this.existingConversationId = body.conversationId;
      }
    } catch {
      // Silencioso: no impide mostrar la reserva
    }
  }
}
