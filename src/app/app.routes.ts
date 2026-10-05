import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'listings', pathMatch: 'full' },
  {
    path: 'listings',
    loadComponent: () => import('./features/listings/listing-list.component').then(m => m.ListingListComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  }
];
