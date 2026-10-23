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
    path: 'listings/:id',
    loadComponent: () =>
      import('./features/listings/listing-detail.component').then(
        (m) => m.ListingDetailComponent,
      ),
  },
  {
    path: 'mis-reservas',
    canActivate: [roleGuard(['HUESPED'])],
    loadComponent: () =>
      import('./features/bookings/my-bookings.component').then(
        (m) => m.MyBookingsComponent,
      ),
  },
  {
    path: 'mi-perfil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/my-profile.component').then(
        (m) => m.MyProfileComponent,
      ),
  },
  {
    path: 'anfitrion/publicaciones',
    canActivate: [roleGuard(['ANFITRION'])],
    loadComponent: () =>
      import('./features/listings/host-availability.component').then(
        (m) => m.HostAvailabilityComponent,
      ),
  },
  {
    path: 'anfitrion/mis-publicaciones',
    canActivate: [roleGuard(['ANFITRION'])],
    loadComponent: () =>
      import('./features/listings/my-listings.component').then(
        (m) => m.MyListingsComponent,
      ),
  },
  {
    path: 'anfitrion/publicaciones/nueva',
    canActivate: [roleGuard(['ANFITRION'])],
    loadComponent: () =>
      import('./features/listings/listing-draft-form.component').then(
        (m) => m.ListingDraftFormComponent,
      ),
  },
  {
    path: 'anfitrion/publicaciones/:id/tarifas',
    canActivate: [roleGuard(['ANFITRION'])],
    loadComponent: () =>
      import('./features/listings/listing-pricing.component').then(
        (m) => m.ListingPricingComponent,
      ),
  },
  {
    path: 'admin/configuracion',
    canActivate: [roleGuard(['ADMINISTRADOR'])],
    loadComponent: () =>
      import('./features/admin/platform-settings.component').then(
        (m) => m.PlatformSettingsComponent,
      ),
  },
  {
    path: 'admin/moderacion',
    canActivate: [roleGuard(['ADMINISTRADOR'])],
    loadComponent: () =>
      import('./features/listings/admin-moderation.component').then(
        (m) => m.AdminModerationComponent,
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
    path: 'auth/recuperar',
    loadComponent: () =>
      import('./features/auth/password-recovery.component').then(
        (m) => m.PasswordRecoveryComponent,
      ),
  },
  {
    path: 'register',
    redirectTo: 'auth/register',
    pathMatch: 'full',
  },
];
