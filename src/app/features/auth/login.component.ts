import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div style="max-width: 400px; margin: 40px auto; padding: 24px; background: white; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
      <h2>Iniciar Sesión</h2>
      <p style="color: #64748b; margin-bottom: 16px;">Acceso para Huéspedes, Anfitriones y Administradores</p>
    </div>
  `
})
export class LoginComponent {}
