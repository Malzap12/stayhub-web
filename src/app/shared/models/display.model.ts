import { Pipe, PipeTransform } from '@angular/core';

/** Iniciales para un avatar: "Laura Gómez" -> "LG". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** Nombre legible de los roles y estados que llegan del API con su código interno. */
export const STATUS_TEXT: Record<string, string> = {
  HUESPED: 'Huésped',
  ANFITRION: 'Anfitrión',
  ADMINISTRADOR: 'Administrador',
  PENDIENTE: 'Pendiente de pago',
  PENDIENTE_APROBACION: 'Esperando aprobación',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  COMPLETADA: 'Completada',
  EN_REVISION: 'En revisión',
  APROBADO: 'aprobado',
  RECHAZADO: 'rechazado',
};

export function statusText(code?: string | null): string {
  if (!code) return '';
  return STATUS_TEXT[code] ?? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, ' ');
}

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(code?: string | null): string {
    return statusText(code);
  }
}
