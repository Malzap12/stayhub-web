import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getActiveSession, updateActiveSessionName } from '../../core/guards/auth.guard';
import { AccountStatus, UserProfile, UserRole } from '../../shared/models/user.model';
import { AccountDeactivationComponent } from './account-deactivation.component';
import { ACCOUNT_REACTIVATED_STATE, arrivedWith, REACTIVATED_GUEST_MESSAGE } from '../../shared/models/account-deactivation.model';

const ROLE_LABELS: Record<UserRole, string> = {
  HUESPED: 'Huésped',
  ANFITRION: 'Anfitrión',
  ADMINISTRADOR: 'Administrador',
};

const STATUS_LABELS: Record<AccountStatus, string> = {
  ACTIVA: 'Activa',
  DESACTIVADA: 'Desactivada',
  RESTRINGIDA: 'Restringida',
};

/** Mismo formato que valida el API: 7 a 15 dígitos, con indicativo y separadores opcionales. */
const PHONE_REGEX = /^\+?\d(?:[\s-]?\d){6,14}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

type ApiError = { message?: string | string[] };

/**
 * HU-006 · Consultar mi perfil (CA1, CA2, RF-009).
 * El usuario autenticado ve su nombre, correo, teléfono, rol y estado de la cuenta.
 * Siempre consulta /api/users/me y nunca un identificador, así que solo carga el perfil propio.
 *
 * HU-007 · Actualizar mi perfil (CA1, CA2, CA3, RF-010).
 * Edita nombre y teléfono, cambia la contraseña con la actual, y muestra el correo
 * y el rol como campos que no se pueden editar.
 *
 * HU-008 · Desactivar mi cuenta (CA1, CA2, CA3, RF-011): huéspedes y anfitriones la desactivan desde aquí.
 */
@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, AccountDeactivationComponent],
  template: `
    <section class="profile-shell">
      <header class="page-header">
        <span class="eyebrow">Mi cuenta</span>
        <h1>Mi perfil</h1>
        <p class="subtitle">Verifica que tu información sea correcta y mantenla al día.</p>
      </header>

      <div class="alert-success welcome-back" *ngIf="welcomeBack" role="status">{{ welcomeBack }}</div>

      <p class="loading" *ngIf="loading" role="status">Cargando tu perfil…</p>

      <div class="alert-error" *ngIf="errorMessage" role="alert">
        {{ errorMessage }}
        <button type="button" class="retry-btn" (click)="load()">Reintentar</button>
      </div>

      <ng-container *ngIf="!loading && profile as user">
        <article class="profile-card">
          <div class="identity">
            <span class="avatar" aria-hidden="true">{{ user.name.charAt(0).toUpperCase() }}</span>
            <div>
              <h2>{{ user.name }}</h2>
              <span class="status-badge" [attr.data-status]="user.status">{{ statusLabel(user) }}</span>
            </div>
          </div>

          <form class="profile-form" (ngSubmit)="saveProfile()" novalidate>
            <h3>Datos personales</h3>

            <div class="field">
              <label for="profile-name">Nombre</label>
              <input id="profile-name" name="name" type="text" autocomplete="name" [(ngModel)]="form.name" (input)="profileMessage = ''" />
              <p class="field-error" *ngIf="nameError" role="alert">{{ nameError }}</p>
            </div>

            <div class="field">
              <label for="profile-phone">Teléfono <span class="optional">(opcional)</span></label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                autocomplete="tel"
                placeholder="Ej. +57 300 123 4567"
                [(ngModel)]="form.phone"
                (input)="profileMessage = ''"
              />
              <p class="field-error" *ngIf="phoneError" role="alert">{{ phoneError }}</p>
            </div>

            <!-- CA3: correo y rol solo de lectura -->
            <div class="field">
              <label for="profile-email">Correo electrónico</label>
              <input id="profile-email" name="email" type="email" [value]="user.email" readonly disabled aria-describedby="locked-hint" />
            </div>

            <div class="field">
              <label for="profile-role">Rol</label>
              <input id="profile-role" name="role" type="text" [value]="roleLabel(user)" readonly disabled aria-describedby="locked-hint" />
            </div>
            <p id="locked-hint" class="hint">El correo y el rol no se pueden editar.</p>

            <div class="field">
              <span class="label">Estado de la cuenta</span>
              <span class="value">{{ statusLabel(user) }}</span>
            </div>

            <div class="alert-success" *ngIf="profileMessage && !profileFailed" role="status">{{ profileMessage }}</div>
            <div class="alert-inline-error" *ngIf="profileMessage && profileFailed" role="alert">{{ profileMessage }}</div>

            <button type="submit" class="primary-btn" [disabled]="savingProfile || !canSaveProfile">
              {{ savingProfile ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </form>
        </article>

        <article class="profile-card">
          <form class="profile-form" (ngSubmit)="changePassword()" novalidate>
            <h3>Cambiar contraseña</h3>

            <div class="field">
              <label for="current-password">Contraseña actual</label>
              <input
                id="current-password"
                name="currentPassword"
                type="password"
                autocomplete="current-password"
                [(ngModel)]="passwordForm.currentPassword"
                (input)="passwordMessage = ''"
              />
            </div>

            <div class="field">
              <label for="new-password">Nueva contraseña</label>
              <input
                id="new-password"
                name="newPassword"
                type="password"
                autocomplete="new-password"
                [(ngModel)]="passwordForm.newPassword"
                (input)="passwordMessage = ''"
                aria-describedby="password-hint"
              />
              <p id="password-hint" class="hint">Debe tener al menos 8 caracteres y combinar letras y números.</p>
              <p class="field-error" *ngIf="newPasswordError" role="alert">{{ newPasswordError }}</p>
            </div>

            <div class="field">
              <label for="confirm-password">Confirmar nueva contraseña</label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                [(ngModel)]="passwordForm.confirmPassword"
                (input)="passwordMessage = ''"
              />
              <p class="field-error" *ngIf="confirmPasswordError" role="alert">{{ confirmPasswordError }}</p>
            </div>

            <div class="alert-success" *ngIf="passwordMessage && !passwordFailed" role="status">{{ passwordMessage }}</div>
            <div class="alert-inline-error" *ngIf="passwordMessage && passwordFailed" role="alert">{{ passwordMessage }}</div>

            <button type="submit" class="primary-btn" [disabled]="savingPassword || !canChangePassword">
              {{ savingPassword ? 'Actualizando…' : 'Actualizar contraseña' }}
            </button>
          </form>
        </article>

        <app-account-deactivation *ngIf="user.role !== 'ADMINISTRADOR'"></app-account-deactivation>
      </ng-container>
    </section>
  `,
  styles: [`
    .profile-shell {
      max-width: 720px;
      margin: 0 auto;
      padding: 36px 24px 72px;
      color: #1d1d1f;
    }
    .page-header {
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
    .loading {
      color: #6e6e73;
    }
    .alert-error {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 13px 16px;
      border-radius: 12px;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
      font-size: 0.88rem;
      font-weight: 600;
    }
    .retry-btn {
      padding: 6px 14px;
      border-radius: 980px;
      border: 1px solid #fecaca;
      background: #ffffff;
      color: #991b1b;
      font-weight: 600;
      cursor: pointer;
    }
    .profile-card {
      background: #ffffff;
      border: 1px solid #e5e5ea;
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 18px;
    }
    .identity {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
    }
    .avatar {
      width: 56px;
      height: 56px;
      flex-shrink: 0;
      border-radius: 50%;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 1.4rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    h2 {
      margin: 0 0 6px;
      font-size: 1.25rem;
      overflow-wrap: anywhere;
    }
    h3 {
      margin: 0 0 14px;
      font-size: 1.02rem;
    }
    .status-badge {
      padding: 4px 10px;
      border-radius: 980px;
      font-size: 0.74rem;
      font-weight: 700;
      background: #f5f5f7;
      color: #3a3a3c;
    }
    .status-badge[data-status='ACTIVA'] { background: #e8f8ee; color: #166534; }
    .status-badge[data-status='RESTRINGIDA'] { background: #fef2f2; color: #991b1b; }
    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label, .label {
      font-size: 0.84rem;
      font-weight: 600;
      color: #3a3a3c;
    }
    .optional {
      font-weight: 400;
      color: #6e6e73;
    }
    .value {
      font-size: 0.92rem;
      font-weight: 600;
    }
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #d2d2d7;
      font-size: 0.92rem;
      color: #1d1d1f;
      background: #ffffff;
    }
    input:focus {
      border-color: #1d1d1f;
      outline: none;
    }
    input:disabled {
      background: #f5f5f7;
      color: #6e6e73;
      cursor: not-allowed;
    }
    .hint {
      margin: -6px 0 0;
      font-size: 0.78rem;
      color: #6e6e73;
    }
    .field .hint {
      margin: 0;
    }
    .field-error {
      margin: 0;
      font-size: 0.78rem;
      font-weight: 500;
      color: #d70015;
    }
    .welcome-back {
      margin-bottom: 18px;
    }
    .alert-success, .alert-inline-error {
      padding: 11px 14px;
      border-radius: 12px;
      font-size: 0.86rem;
      font-weight: 600;
    }
    .alert-success {
      background: #e8f8ee;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .alert-inline-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .primary-btn {
      align-self: flex-start;
      padding: 10px 18px;
      border-radius: 980px;
      border: none;
      background: #1d1d1f;
      color: #ffffff;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
    }
    .primary-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `],
})
export class MyProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  /** Aviso al llegar después de reactivar la cuenta. */
  welcomeBack = arrivedWith(ACCOUNT_REACTIVATED_STATE) ? REACTIVATED_GUEST_MESSAGE : '';
  loading = false;
  errorMessage = '';

  form = { name: '', phone: '' };
  savingProfile = false;
  profileMessage = '';
  profileFailed = false;

  passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  savingPassword = false;
  passwordMessage = '';
  passwordFailed = false;

  ngOnInit(): void {
    void this.load();
  }

  roleLabel(user: UserProfile): string {
    return ROLE_LABELS[user.role] ?? user.role;
  }

  statusLabel(user: UserProfile): string {
    return STATUS_LABELS[user.status] ?? user.status;
  }

  get nameError(): string {
    return this.form.name.trim() ? '' : 'El nombre no puede quedar vacío.';
  }

  get phoneError(): string {
    const phone = this.form.phone.trim();
    return phone && !PHONE_REGEX.test(phone)
      ? 'Ingresa un teléfono válido: solo números, espacios o guiones (7 a 15 dígitos).'
      : '';
  }

  /** Solo se guarda si hay cambios válidos respecto al perfil cargado. */
  get canSaveProfile(): boolean {
    if (!this.profile || this.nameError || this.phoneError) {
      return false;
    }
    return (
      this.form.name.trim() !== this.profile.name || this.form.phone.trim() !== (this.profile.phone ?? '')
    );
  }

  get newPasswordError(): string {
    const pwd = this.passwordForm.newPassword;
    return pwd && !PASSWORD_REGEX.test(pwd)
      ? 'La contraseña debe tener al menos 8 caracteres y combinar letras y números.'
      : '';
  }

  get confirmPasswordError(): string {
    const { newPassword, confirmPassword } = this.passwordForm;
    return confirmPassword && confirmPassword !== newPassword ? 'Las contraseñas no coinciden.' : '';
  }

  get canChangePassword(): boolean {
    const { currentPassword, newPassword, confirmPassword } = this.passwordForm;
    return Boolean(currentPassword && newPassword && confirmPassword) && !this.newPasswordError && !this.confirmPasswordError;
  }

  private authHeaders(): Record<string, string> {
    const token = getActiveSession()?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private apiMessage(status: number, body: ApiError, fallback: string): string {
    if (status === 401) {
      return 'Tu sesión expiró. Inicia sesión de nuevo.';
    }
    return [body?.message].flat().filter(Boolean).join(' ') || fallback;
  }

  private setProfile(profile: UserProfile): void {
    this.profile = profile;
    this.form = { name: profile.name, phone: profile.phone ?? '' };
  }

  async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await fetch('/api/users/me', { headers: this.authHeaders() });

      if (response.status === 401) {
        this.errorMessage = 'Tu sesión expiró. Inicia sesión de nuevo para ver tu perfil.';
        return;
      }
      if (!response.ok) {
        this.errorMessage = 'No fue posible cargar tu perfil. Intenta de nuevo.';
        return;
      }

      this.setProfile((await response.json()) as UserProfile);
    } catch {
      this.errorMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  /** HU-007 CA1: guarda nombre y teléfono; solo envía estos campos (CA3). */
  async saveProfile(): Promise<void> {
    if (!this.canSaveProfile) {
      return;
    }
    this.savingProfile = true;
    this.profileMessage = '';
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({ name: this.form.name.trim(), phone: this.form.phone.trim() || null }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.profileFailed = true;
        this.profileMessage = this.apiMessage(response.status, body, 'No fue posible guardar tus datos.');
        return;
      }

      const updated = body as UserProfile;
      this.setProfile(updated);
      updateActiveSessionName(updated.name);
      this.profileFailed = false;
      this.profileMessage = 'Tus datos se actualizaron correctamente.';
    } catch {
      this.profileFailed = true;
      this.profileMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.savingProfile = false;
    }
  }

  /** HU-007 CA2: cambia la contraseña con la actual y una nueva que cumple la política. */
  async changePassword(): Promise<void> {
    if (!this.canChangePassword) {
      return;
    }
    this.savingPassword = true;
    this.passwordMessage = '';
    try {
      const response = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...this.authHeaders() },
        body: JSON.stringify({
          currentPassword: this.passwordForm.currentPassword,
          newPassword: this.passwordForm.newPassword,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        this.passwordFailed = true;
        this.passwordMessage = this.apiMessage(response.status, body, 'No fue posible actualizar la contraseña.');
        return;
      }

      this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
      this.passwordFailed = false;
      this.passwordMessage = 'Tu contraseña se actualizó. Las demás sesiones abiertas se cerraron.';
    } catch {
      this.passwordFailed = true;
      this.passwordMessage = 'No fue posible conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.savingPassword = false;
    }
  }
}
