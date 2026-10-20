import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

export interface SimulatedMail {
  id: string;
  to: string;
  subject: string;
  body: string;
  token: string;
  expiresAt: string;
  sentAt: string;
}

export type RecoveryStep = 'request' | 'mailbox' | 'reset' | 'done';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="apple-auth-page" aria-labelledby="recovery-title">
      <section class="apple-card">
        <header class="apple-card-header">
          <p class="apple-eyebrow">Inversiones LR · Seguridad</p>
          <h1 id="recovery-title">Recupera tu contraseña</h1>
          <p class="apple-subtitle">
            Te enviaremos un enlace de un solo uso a tu <strong>buzón simulado</strong>.
          </p>
        </header>

        <!-- CA1 y CA4: solicitud con confirmación genérica -->
        <form *ngIf="step === 'request'" (ngSubmit)="requestRecovery()" novalidate class="apple-form">
          <div class="apple-field">
            <label for="recovery-email" class="apple-label">Correo electrónico</label>
            <input
              id="recovery-email"
              name="email"
              type="email"
              autocomplete="email"
              placeholder="nombre@correo.com"
              [(ngModel)]="email"
              [class.input-error]="submitted && emailError"
              aria-describedby="recovery-email-error"
              required
            />
            <p *ngIf="submitted && emailError" id="recovery-email-error" class="field-error" role="alert">
              {{ emailError }}
            </p>
          </div>
          <button type="submit" class="apple-btn-primary" [disabled]="loading">
            {{ loading ? 'Enviando...' : 'Enviar enlace de recuperación' }}
          </button>
        </form>

        <!-- Buzón simulado (AMB-33, SUP-11) -->
        <section *ngIf="step === 'mailbox'" class="apple-form" aria-live="polite">
          <div class="banner-success" role="status">{{ confirmationMessage }}</div>

          <h2 class="section-title">Buzón simulado de {{ email }}</h2>
          <p *ngIf="mailbox.length === 0" class="field-hint">
            No hay mensajes para este correo.
          </p>
          <ul class="mail-list">
            <li *ngFor="let mail of mailbox; let first = first" class="mail-item">
              <div class="mail-head">
                <strong>{{ mail.subject }}</strong>
                <span *ngIf="first" class="mail-badge">Más reciente</span>
              </div>
              <p>{{ mail.body }}</p>
              <p class="field-hint">Vence: {{ mail.expiresAt | date: 'short' }}</p>
              <button type="button" class="apple-btn-secondary" (click)="useToken(mail.token)">
                Usar este enlace
              </button>
            </li>
          </ul>
          <button type="button" class="link-btn" (click)="restart()">Usar otro correo</button>
        </section>

        <!-- CA2 y CA3: nueva contraseña con token -->
        <form *ngIf="step === 'reset'" (ngSubmit)="resetPassword()" novalidate class="apple-form">
          <div class="apple-field">
            <label for="new-password" class="apple-label">Nueva contraseña</label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              autocomplete="new-password"
              placeholder="Mínimo 8 caracteres con letras y números"
              [(ngModel)]="newPassword"
              [class.input-error]="submitted && passwordError"
              required
            />
          </div>
          <div class="apple-field">
            <label for="confirm-password" class="apple-label">Confirmar contraseña</label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autocomplete="new-password"
              [(ngModel)]="confirmPassword"
              [class.input-error]="submitted && passwordError"
              required
            />
            <p class="field-hint">Debe tener al menos 8 caracteres y combinar letras y números.</p>
            <p *ngIf="submitted && passwordError" class="field-error" role="alert">{{ passwordError }}</p>
          </div>

          <div *ngIf="tokenError" class="banner-error" role="alert">
            <span>{{ tokenError }}</span>
            <button type="button" class="link-btn" (click)="requestNewToken()">
              Solicitar un nuevo enlace
            </button>
          </div>

          <button type="submit" class="apple-btn-primary" [disabled]="loading">
            {{ loading ? 'Guardando...' : 'Guardar nueva contraseña' }}
          </button>
        </form>

        <div *ngIf="step === 'done'" class="banner-success" role="status">
          <strong>{{ successMessage }}</strong>
          <a routerLink="/auth/login" class="banner-link">Ir a Iniciar sesión →</a>
        </div>

        <footer class="apple-card-footer">
          <span>¿Recordaste tu contraseña?</span>
          <a routerLink="/auth/login">Iniciar sesión</a>
        </footer>
      </section>
    </main>
  `,
  styles: [`
    .apple-auth-page {
      min-height: calc(100vh - 64px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }
    .apple-card {
      width: 100%;
      max-width: 460px;
      background: var(--apple-surface, #ffffff);
      border-radius: var(--apple-radius-lg, 20px);
      box-shadow: var(--apple-shadow, 0 12px 32px rgba(0, 0, 0, 0.06));
      border: 1px solid var(--apple-border-subtle, rgba(0, 0, 0, 0.08));
      padding: 36px 32px;
    }
    .apple-card-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .apple-eyebrow {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--apple-text-secondary, #6e6e73);
      margin-bottom: 6px;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--apple-text-primary, #1d1d1f);
      margin-bottom: 8px;
    }
    .apple-subtitle {
      font-size: 0.9375rem;
      color: var(--apple-text-secondary, #6e6e73);
    }
    .section-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--apple-text-primary, #1d1d1f);
      overflow-wrap: anywhere;
    }
    .apple-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .apple-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .apple-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--apple-text-primary, #1d1d1f);
    }
    input {
      width: 100%;
      padding: 13px 14px;
      font-size: 0.9375rem;
      border: 1px solid var(--apple-border, #d2d2d7);
      border-radius: var(--apple-radius-md, 12px);
      background: #ffffff;
      color: var(--apple-text-primary, #1d1d1f);
    }
    input:focus {
      border-color: var(--apple-ink, #1d1d1f);
      outline: none;
    }
    input.input-error {
      border-color: var(--apple-red, #d70015);
      background: var(--apple-red-bg, #fff2f4);
    }
    .field-hint {
      font-size: 0.75rem;
      color: var(--apple-text-secondary, #6e6e73);
    }
    .field-error {
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--apple-red, #d70015);
    }
    .mail-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .mail-item {
      border: 1px solid var(--apple-border-subtle, rgba(0, 0, 0, 0.08));
      border-radius: 14px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.85rem;
      color: var(--apple-text-primary, #1d1d1f);
    }
    .mail-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .mail-badge {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--apple-green, #248a3d);
      white-space: nowrap;
    }
    .banner-success,
    .banner-error {
      padding: 12px 14px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 0.85rem;
    }
    .banner-success {
      background: var(--apple-green-bg, #f2fbf5);
      border: 1px solid rgba(36, 138, 61, 0.25);
      color: var(--apple-green, #248a3d);
    }
    .banner-error {
      background: var(--apple-red-bg, #fff2f4);
      border: 1px solid rgba(215, 0, 21, 0.25);
      color: var(--apple-red, #d70015);
    }
    .banner-link {
      font-weight: 600;
    }
    .apple-btn-primary,
    .apple-btn-secondary {
      width: 100%;
      padding: 14px 20px;
      border-radius: 14px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
    }
    .apple-btn-primary {
      border: none;
      background: var(--apple-ink, #1d1d1f);
      color: #ffffff;
    }
    .apple-btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .apple-btn-secondary {
      padding: 10px 16px;
      border: 1px solid var(--apple-border, #d2d2d7);
      background: #ffffff;
      color: var(--apple-text-primary, #1d1d1f);
    }
    .link-btn {
      align-self: flex-start;
      border: none;
      background: none;
      padding: 0;
      font-weight: 600;
      color: inherit;
      text-decoration: underline;
      cursor: pointer;
    }
    .apple-card-footer {
      margin-top: 24px;
      padding-top: 18px;
      border-top: 1px solid var(--apple-border-subtle, rgba(0, 0, 0, 0.08));
      display: flex;
      justify-content: center;
      gap: 6px;
      font-size: 0.85rem;
      color: var(--apple-text-secondary, #6e6e73);
    }
    @media (max-width: 420px) {
      .apple-card {
        padding: 24px 18px;
      }
    }
  `],
})
export class PasswordRecoveryComponent implements OnInit {
  static readonly CONFIRMATION_MESSAGE =
    'Si el correo está registrado, recibirás un enlace de recuperación en tu buzón.';
  static readonly INVALID_TOKEN_MESSAGE =
    'El enlace de recuperación no es válido, venció o ya fue usado. Solicita uno nuevo.';

  step: RecoveryStep = 'request';
  email = '';
  token = '';
  newPassword = '';
  confirmPassword = '';
  mailbox: SimulatedMail[] = [];
  confirmationMessage = '';
  tokenError = '';
  successMessage = '';
  submitted = false;
  loading = false;

  constructor(private readonly route?: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    const email = this.route?.snapshot.queryParamMap.get('email');
    if (email) {
      this.email = email;
      this.confirmationMessage = PasswordRecoveryComponent.CONFIRMATION_MESSAGE;
      await this.loadMailbox();
      this.step = 'mailbox';
    }
  }

  get emailError(): string {
    const email = this.email.trim();
    if (!email) {
      return 'El correo electrónico es obligatorio.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Ingresa un correo electrónico con formato válido.';
    }
    return '';
  }

  get passwordError(): string {
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(this.newPassword)) {
      return 'La contraseña debe tener al menos 8 caracteres y combinar letras y números.';
    }
    if (this.newPassword !== this.confirmPassword) {
      return 'Las contraseñas no coinciden.';
    }
    return '';
  }

  async requestRecovery(): Promise<void> {
    this.submitted = true;
    if (this.emailError) {
      return;
    }

    this.email = this.email.trim().toLowerCase();
    this.loading = true;
    try {
      const response = await fetch('/api/auth/password-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email }),
      });
      const body = await response.json().catch(() => ({}));
      this.confirmationMessage = body?.message || PasswordRecoveryComponent.CONFIRMATION_MESSAGE;
    } catch {
      this.confirmationMessage = PasswordRecoveryComponent.CONFIRMATION_MESSAGE;
    }

    await this.loadMailbox();
    this.submitted = false;
    this.loading = false;
    this.step = 'mailbox';
  }

  async loadMailbox(): Promise<void> {
    try {
      const response = await fetch(
        `/api/auth/password-recovery/mailbox?email=${encodeURIComponent(this.email)}`,
      );
      this.mailbox = response.ok ? await response.json() : [];
    } catch {
      this.mailbox = [];
    }
  }

  useToken(token: string): void {
    this.token = token;
    this.newPassword = '';
    this.confirmPassword = '';
    this.tokenError = '';
    this.submitted = false;
    this.step = 'reset';
  }

  async resetPassword(): Promise<void> {
    this.submitted = true;
    this.tokenError = '';
    if (this.passwordError) {
      return;
    }

    this.loading = true;
    try {
      const response = await fetch('/api/auth/password-recovery/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.token, newPassword: this.newPassword }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.tokenError = body?.canRequestNewToken
          ? body.message
          : [body?.message].flat().join(' ') || PasswordRecoveryComponent.INVALID_TOKEN_MESSAGE;
        return;
      }

      this.successMessage = body?.message || 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.';
      this.step = 'done';
    } catch {
      this.tokenError = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  async requestNewToken(): Promise<void> {
    this.tokenError = '';
    await this.requestRecovery();
  }

  restart(): void {
    this.step = 'request';
    this.email = '';
    this.mailbox = [];
    this.submitted = false;
  }
}
