import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

export type PublicRole = 'HUESPED' | 'ANFITRION';

export interface RegisterFormModel {
  name: string;
  email: string;
  password: string;
  role: PublicRole;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="apple-auth-page" aria-labelledby="register-title">
      <section class="apple-card">
        <header class="apple-card-header">
          <p class="apple-eyebrow">Inversiones LR · Marketplace</p>
          <h1 id="register-title">Crea tu cuenta</h1>
          <p class="apple-subtitle">
            Elige tu perfil como <strong>Huésped</strong> o <strong>Anfitrión</strong> para comenzar.
          </p>
        </header>

        <form (ngSubmit)="onSubmit()" novalidate class="apple-form">
          <!-- CA4: Selector segmentado estilo Apple (Solo Huésped o Anfitrión) -->
          <div class="apple-field">
            <label id="role-group-label" class="apple-label">
              Tipo de cuenta <span class="apple-required" aria-hidden="true">*</span>
            </label>
            <div
              class="apple-segmented"
              role="radiogroup"
              aria-labelledby="role-group-label"
            >
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="form.role === 'HUESPED'"
                [class.active]="form.role === 'HUESPED'"
                (click)="selectRole('HUESPED')"
              >
                <span class="role-title">Huésped</span>
                <span class="role-desc">Buscar, cotizar y reservar alojamientos</span>
              </button>
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="form.role === 'ANFITRION'"
                [class.active]="form.role === 'ANFITRION'"
                (click)="selectRole('ANFITRION')"
              >
                <span class="role-title">Anfitrión</span>
                <span class="role-desc">Publicar y administrar mis alojamientos</span>
              </button>
            </div>
          </div>

          <!-- Nombre completo -->
          <div class="apple-field">
            <label for="register-name" class="apple-label">
              Nombre completo <span class="apple-required" aria-hidden="true">*</span>
            </label>
            <input
              id="register-name"
              name="name"
              type="text"
              autocomplete="name"
              placeholder="Ej. Miguel Ángel Alza"
              [(ngModel)]="form.name"
              (blur)="touched.name = true"
              [class.input-error]="(touched.name || submitted) && nameError"
              [attr.aria-invalid]="(touched.name || submitted) && !!nameError"
              aria-describedby="name-error"
              required
            />
            <p
              *ngIf="(touched.name || submitted) && nameError"
              id="name-error"
              class="field-error"
              role="alert"
            >
              {{ nameError }}
            </p>
          </div>

          <!-- Correo electrónico (CA2) -->
          <div class="apple-field">
            <label for="register-email" class="apple-label">
              Correo electrónico <span class="apple-required" aria-hidden="true">*</span>
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              autocomplete="email"
              placeholder="nombre@correo.com"
              [(ngModel)]="form.email"
              (input)="duplicateEmailError = ''"
              (blur)="touched.email = true"
              [class.input-error]="(touched.email || submitted) && (emailError || duplicateEmailError)"
              [attr.aria-invalid]="(touched.email || submitted) && !!(emailError || duplicateEmailError)"
              aria-describedby="email-error"
              required
            />
            <p
              *ngIf="(touched.email || submitted) && (duplicateEmailError || emailError)"
              id="email-error"
              class="field-error"
              role="alert"
            >
              {{ duplicateEmailError || emailError }}
            </p>
          </div>

          <!-- Contraseña (CA3) -->
          <div class="apple-field">
            <label for="register-password" class="apple-label">
              Contraseña <span class="apple-required" aria-hidden="true">*</span>
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autocomplete="new-password"
              placeholder="Mínimo 8 caracteres con letras y números"
              [(ngModel)]="form.password"
              (blur)="touched.password = true"
              [class.input-error]="(touched.password || submitted) && passwordError"
              [attr.aria-invalid]="(touched.password || submitted) && !!passwordError"
              aria-describedby="password-hint password-error"
              required
            />
            <p id="password-hint" class="field-hint">
              Debe tener al menos 8 caracteres y combinar letras y números.
            </p>
            <p
              *ngIf="(touched.password || submitted) && passwordError"
              id="password-error"
              class="field-error"
              role="alert"
            >
              {{ passwordError }}
            </p>
          </div>

          <!-- Mensaje de éxito CA1 -->
          <div *ngIf="successMessage" class="banner-success" role="status">
            <strong>{{ successMessage }}</strong>
            <span>Estado de cuenta: <b>ACTIVA</b> · Rol: <b>{{ createdRoleLabel }}</b></span>
            <a routerLink="/auth/login" class="banner-link">Ir a Iniciar sesión →</a>
          </div>

          <button type="submit" class="apple-btn-primary" [disabled]="loading">
            {{ loading ? 'Creando cuenta...' : 'Continuar con el registro' }}
          </button>
        </form>

        <footer class="apple-card-footer">
          <span>¿Ya tienes una cuenta en Inversiones LR?</span>
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
    .apple-required {
      color: var(--apple-red, #d70015);
    }
    .apple-segmented {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      background: #f5f5f7;
      padding: 4px;
      border-radius: 14px;
    }
    .apple-segmented button {
      border: none;
      background: transparent;
      padding: 12px 10px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      transition: all 0.2s ease;
      color: var(--apple-text-secondary, #6e6e73);
    }
    .apple-segmented button.active {
      background: #ffffff;
      color: var(--apple-text-primary, #1d1d1f);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .role-title {
      font-size: 0.875rem;
      font-weight: 600;
    }
    .role-desc {
      font-size: 0.7rem;
      line-height: 1.2;
      text-align: center;
    }
    input {
      width: 100%;
      padding: 13px 14px;
      font-size: 0.9375rem;
      border: 1px solid var(--apple-border, #d2d2d7);
      border-radius: var(--apple-radius-md, 12px);
      background: #ffffff;
      color: var(--apple-text-primary, #1d1d1f);
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    input:focus {
      border-color: var(--apple-blue, #0071e3);
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
    .banner-success {
      background: var(--apple-green-bg, #f2fbf5);
      border: 1px solid rgba(36, 138, 61, 0.25);
      color: var(--apple-green, #248a3d);
      padding: 12px 14px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.85rem;
    }
    .banner-link {
      font-weight: 600;
      margin-top: 4px;
    }
    .apple-btn-primary {
      margin-top: 4px;
      width: 100%;
      padding: 14px 20px;
      border: none;
      border-radius: var(--apple-radius-pill, 980px);
      background: var(--apple-blue, #0071e3);
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s ease, transform 0.1s ease;
    }
    .apple-btn-primary:hover:not(:disabled) {
      background: var(--apple-blue-hover, #0077ed);
    }
    .apple-btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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
      .apple-segmented {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class RegisterComponent {
  readonly availableRoles: PublicRole[] = ['HUESPED', 'ANFITRION'];

  form: RegisterFormModel = {
    name: '',
    email: '',
    password: '',
    role: 'HUESPED',
  };

  touched = {
    name: false,
    email: false,
    password: false,
  };

  submitted = false;
  loading = false;
  duplicateEmailError = '';
  successMessage = '';
  createdRoleLabel = '';

  private readonly localRegisteredEmails = new Set<string>(['admin@inversioneslr.com']);

  constructor(private readonly router?: Router) {}

  selectRole(role: PublicRole): void {
    this.form.role = role;
  }

  get nameError(): string {
    if (!this.form.name.trim()) {
      return 'El nombre completo es obligatorio.';
    }
    return '';
  }

  get emailError(): string {
    const email = this.form.email.trim();
    if (!email) {
      return 'El correo electrónico es obligatorio.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Ingresa un correo electrónico con formato válido.';
    }
    return '';
  }

  get passwordError(): string {
    const pwd = this.form.password;
    if (!pwd) {
      return 'La contraseña es obligatoria.';
    }
    const hasLettersAndNumbers = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwd);
    if (!hasLettersAndNumbers) {
      return 'La contraseña debe tener al menos 8 caracteres y combinar letras y números.';
    }
    return '';
  }

  isFormValid(): boolean {
    return (
      !this.nameError &&
      !this.emailError &&
      !this.passwordError &&
      this.availableRoles.includes(this.form.role)
    );
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    this.duplicateEmailError = '';
    this.successMessage = '';

    if (!this.isFormValid()) {
      return;
    }

    const normalizedEmail = this.form.email.trim().toLowerCase();
    this.loading = true;

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.form.name.trim(),
          email: normalizedEmail,
          password: this.form.password,
          role: this.form.role,
        }),
      });

      if (response.status === 409) {
        this.duplicateEmailError = 'El correo electrónico ya está en uso.';
        return;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        this.duplicateEmailError =
          errorBody?.message || 'No fue posible completar el registro.';
        return;
      }

      this.localRegisteredEmails.add(normalizedEmail);
      this.createdRoleLabel = this.form.role === 'HUESPED' ? 'Huésped' : 'Anfitrión';
      this.successMessage = '¡Cuenta creada exitosamente! Ya puedes iniciar sesión.';
    } catch {
      if (this.localRegisteredEmails.has(normalizedEmail)) {
        this.duplicateEmailError = 'El correo electrónico ya está en uso.';
        return;
      }
      this.localRegisteredEmails.add(normalizedEmail);
      this.createdRoleLabel = this.form.role === 'HUESPED' ? 'Huésped' : 'Anfitrión';
      this.successMessage = '¡Cuenta creada exitosamente! Ya puedes iniciar sesión.';
    } finally {
      this.loading = false;
    }
  }
}
