import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { clearActiveSession, getActiveSession } from '../../core/guards/auth.guard';
import {
  ACCOUNT_DEACTIVATED_STATE,
  DeactivationCheck,
  stayLink,
  stayRangeText,
  stayRelationText,
  UpcomingStay,
  upcomingStaysText,
} from '../../shared/models/account-deactivation.model';

type Step = 'idle' | 'checking' | 'blocked' | 'confirm' | 'deactivating';

/**
 * HU-008 · Desactivar mi cuenta (CA1, CA2, CA3 · RF-011).
 * Primero revisa con el API qué pasaría: si hay reservas futuras confirmadas las muestra y no deja continuar (CA2);
 * si no, pide confirmación y avisa qué publicaciones activas se pausarán (CA3). Al confirmar, la cuenta queda
 * desactivada, la sesión se cierra y se vuelve al inicio de sesión (CA1).
 */
@Component({
  selector: 'app-account-deactivation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="deactivation-card">
      <h2>Desactivar mi cuenta</h2>
      <p class="intro">
        Dejarás de usar la plataforma y tu sesión se cerrará. Tu historial de reservas y reseñas se conserva.
      </p>

      <div class="alert-error" *ngIf="errorMessage" role="alert">{{ errorMessage }}</div>

      <button
        type="button"
        class="danger-outline-btn start-btn"
        *ngIf="step === 'idle' || step === 'checking'"
        [disabled]="step === 'checking'"
        (click)="review()"
      >
        {{ step === 'checking' ? 'Revisando…' : 'Desactivar mi cuenta' }}
      </button>

      <!-- CA2: reservas futuras confirmadas que impiden desactivar -->
      <div class="blocked-box" *ngIf="step === 'blocked'" role="alert">
        <strong>{{ blockedTitle }}, así que aún no puedes desactivar tu cuenta.</strong>
        <p>Cuando terminen o se cancelen podrás hacerlo.</p>
        <ul class="stay-list">
          <li *ngFor="let stay of upcoming" class="stay-item">
            <div>
              <span class="stay-title">{{ stay.listingTitle }}</span>
              <span class="stay-meta">{{ relation(stay) }} · {{ range(stay) }} · {{ stay.guests }} {{ stay.guests === 1 ? 'huésped' : 'huéspedes' }}</span>
            </div>
            <a [routerLink]="link(stay)" class="stay-link">Ver reserva</a>
          </li>
        </ul>
        <button type="button" class="secondary-btn" (click)="reset()">Entendido</button>
      </div>

      <!-- CA1 y CA3: confirmación -->
      <div class="confirm-box" *ngIf="step === 'confirm' || step === 'deactivating'" role="alertdialog" aria-label="Confirmar desactivación">
        <strong>¿Seguro que quieres desactivar tu cuenta?</strong>
        <p>Tu sesión se cerrará y no podrás iniciar sesión con esta cuenta. Tu historial se conserva.</p>
        <div class="pause-note" *ngIf="check?.listingsToPause?.length">
          <span>Estas publicaciones activas pasarán a pausadas y dejarán de aparecer en las búsquedas:</span>
          <ul>
            <li *ngFor="let listing of check?.listingsToPause">{{ listing.title }}</li>
          </ul>
        </div>
        <div class="confirm-actions">
          <button type="button" class="danger-btn confirm-btn" [disabled]="step === 'deactivating'" (click)="deactivate()">
            {{ step === 'deactivating' ? 'Desactivando…' : 'Sí, desactivar mi cuenta' }}
          </button>
          <button type="button" class="secondary-btn" [disabled]="step === 'deactivating'" (click)="reset()">Cancelar</button>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .deactivation-card {
      margin-top: 20px;
      padding: 24px;
      border-radius: 20px;
      background: #ffffff;
      border: 1px solid #f5c2c7;
    }
    h2 {
      margin: 0 0 6px;
      font-size: 1.1rem;
      color: #b42318;
    }
    .intro {
      margin: 0 0 16px;
      color: #6e6e73;
      font-size: 0.9rem;
      line-height: 1.45;
    }
    .alert-error {
      margin-bottom: 12px;
      padding: 10px 14px;
      border-radius: 12px;
      background: #fdecec;
      color: #b42318;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .danger-outline-btn, .danger-btn, .secondary-btn {
      padding: 10px 18px;
      border-radius: 980px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
    }
    .danger-outline-btn {
      border: 1px solid #d70015;
      background: #ffffff;
      color: #d70015;
    }
    .danger-btn {
      border: none;
      background: #d70015;
      color: #ffffff;
    }
    .secondary-btn {
      border: 1px solid #d2d2d7;
      background: #ffffff;
      color: #1d1d1f;
    }
    button:disabled {
      opacity: 0.6;
      cursor: progress;
    }
    .blocked-box, .confirm-box {
      padding: 14px 16px;
      border-radius: 14px;
      font-size: 0.88rem;
      color: #3a3a3c;
      line-height: 1.45;
    }
    .blocked-box {
      background: #fffaf3;
      border: 1px solid #f5d0a9;
    }
    .confirm-box {
      background: #fff2f4;
      border: 1px solid rgba(215, 0, 21, 0.25);
    }
    .blocked-box strong, .confirm-box strong {
      display: block;
      color: #1d1d1f;
    }
    .blocked-box p, .confirm-box p {
      margin: 4px 0 12px;
    }
    .stay-list {
      list-style: none;
      margin: 0 0 12px;
      padding: 0;
    }
    .stay-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-top: 1px solid #f0e2cf;
    }
    .stay-item > div {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .stay-title {
      font-weight: 600;
      color: #1d1d1f;
      overflow-wrap: anywhere;
    }
    .stay-meta {
      color: #6e6e73;
      font-size: 0.82rem;
    }
    .stay-link {
      color: #0071e3;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
    }
    .pause-note {
      margin-bottom: 12px;
    }
    .pause-note ul {
      margin: 6px 0 0;
      padding-left: 1.1rem;
    }
    .confirm-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `],
})
export class AccountDeactivationComponent {
  step: Step = 'idle';
  check: DeactivationCheck | null = null;
  upcoming: UpcomingStay[] = [];
  errorMessage = '';

  constructor(private readonly router?: Router) {}

  get blockedTitle(): string {
    return upcomingStaysText(this.upcoming.length);
  }

  private authHeaders(): Record<string, string> {
    const token = getActiveSession()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** Consulta qué pasaría al desactivar: reservas que lo impiden (CA2) y publicaciones a pausar (CA3). */
  async review(): Promise<void> {
    this.step = 'checking';
    this.errorMessage = '';
    try {
      const response = await fetch('/api/users/me/deactivation', { headers: this.authHeaders() });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.fail(response.status, body, 'No fue posible revisar tu cuenta. Intenta de nuevo.');
        return;
      }
      this.check = body as DeactivationCheck;
      this.upcoming = this.check.upcomingBookings;
      this.step = this.check.canDeactivate ? 'confirm' : 'blocked';
    } catch {
      this.fail(0, {}, 'No fue posible conectar con el servidor. Intenta de nuevo.');
    }
  }

  /** CA1: desactiva la cuenta, cierra la sesión y lleva al inicio de sesión. */
  async deactivate(): Promise<void> {
    this.step = 'deactivating';
    this.errorMessage = '';
    try {
      const response = await fetch('/api/users/me/deactivate', { method: 'POST', headers: this.authHeaders() });
      const body = await response.json().catch(() => ({}));
      if (response.status === 409) {
        this.upcoming = (body?.upcomingBookings ?? []) as UpcomingStay[];
        this.step = 'blocked';
        return;
      }
      if (!response.ok) {
        this.fail(response.status, body, 'No fue posible desactivar tu cuenta. Intenta de nuevo.');
        return;
      }
      clearActiveSession();
      await this.router?.navigate(['/auth/login'], { state: { [ACCOUNT_DEACTIVATED_STATE]: true } });
    } catch {
      this.fail(0, {}, 'No fue posible conectar con el servidor. Intenta de nuevo.');
    }
  }

  reset(): void {
    this.step = 'idle';
    this.check = null;
    this.upcoming = [];
  }

  relation(stay: UpcomingStay): string {
    return stayRelationText(stay);
  }

  range(stay: UpcomingStay): string {
    return stayRangeText(stay);
  }

  link(stay: UpcomingStay): string[] {
    return stayLink(stay);
  }

  private fail(status: number, body: { message?: string | string[] }, fallback: string): void {
    this.step = 'idle';
    this.errorMessage =
      status === 401 ? 'Tu sesión expiró. Inicia sesión de nuevo.' : [body?.message].flat().filter(Boolean).join(' ') || fallback;
  }
}
