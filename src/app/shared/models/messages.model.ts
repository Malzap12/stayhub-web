export const MESSAGES_POLL_INTERVAL_MS = 5000;
export const MAX_MESSAGE_LENGTH = 1000;

export type MessageSenderRole = 'HUESPED' | 'ANFITRION';

export interface LastMessagePreview {
  content: string;
  createdAt: string;
  senderRole: MessageSenderRole;
}

export interface ConversationSummary {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCity?: string;
  guestId: string;
  guestName: string;
  hostId: string;
  hostName: string;
  counterpartName: string;
  lastMessage?: LastMessagePreview;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  senderName: string;
  content: string;
  createdAt: string;
  readAt?: string;
}

export interface ConversationsPage {
  data: ConversationSummary[];
  unreadConversations: number;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedMessages {
  data: ConversationMessage[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ConversationDetailResponse {
  conversation: ConversationSummary;
  messages: PaginatedMessages;
}

/** Valida que el mensaje tenga contenido real y no supere 1000 caracteres. */
export function validateMessageText(text: string): string | null {
  if (!text || text.trim().length === 0) {
    return 'Escribe un mensaje antes de enviarlo (no puede estar vacío ni contener solo espacios).';
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`;
  }
  return null;
}

/** Fecha y hora legible del mensaje en zona horaria de Colombia. */
export function formatMessageDateTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(iso));
}
