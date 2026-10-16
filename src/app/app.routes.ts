import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'listings', pathMatch: 'full' },
  {
    path: 'listings',
    loadComponent: () =>
      import('./features/listings/listing-list.component').then(
        (m) => m.ListingListComponent,
      ),
  },
  {
    path: 'mis-reservas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/listings/listing-list.component').then(
        (m) => m.ListingListComponent,
      ),
  },
  {
    path: 'anfitrion/publicaciones',
    canActivate: [roleGuard(['ANFITRION', 'ADMINISTRADOR'])],
    loadComponent: () =>
      import('./features/listings/listing-list.component').then(
        (m) => m.ListingListComponent,
      ),
  },
  {
    path: 'admin/moderacion',
    canActivate: [roleGuard(['ADMINISTRADOR'])],
    loadComponent: () =>
      import('./features/listings/listing-list.component').then(
        (m) => m.ListingListComponent,
      ),
  },
  {
    path: 'acceso-denegado',
    loadComponent: () =>
      import('./features/auth/access-denied.component').then(
        (m) => m.AccessDeniedComponent,
      ),
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'register',
    redirectTo: 'auth/register',
    pathMatch: 'full',
  },
];

