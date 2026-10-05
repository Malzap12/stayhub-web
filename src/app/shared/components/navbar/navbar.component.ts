import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header style="background: #1e293b; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
      <h2 style="margin: 0; font-size: 1.25rem;">Inversiones LR</h2>
      <nav style="display: flex; gap: 16px;">
        <a routerLink="/" style="color: white; text-decoration: none;">Explorar</a>
        <a routerLink="/bookings" style="color: white; text-decoration: none;">Mis Reservas</a>
        <a routerLink="/admin" style="color: white; text-decoration: none;">Administración</a>
        <a routerLink="/auth/login" style="color: #38bdf8; text-decoration: none;">Iniciar Sesión</a>
      </nav>
    </header>
  `
})
export class NavbarComponent {}
