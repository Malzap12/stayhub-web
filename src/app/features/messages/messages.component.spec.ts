import {
  ConversationSummary,
  MAX_MESSAGE_LENGTH,
  MESSAGES_POLL_INTERVAL_MS,
  validateMessageText,
} from '../../shared/models/messages.model';
import { MessagesComponent } from './messages.component';

function stubSession(role = 'HUESPED', email = 'laura@stayhub.com'): void {
  const store: Record<string, string> = {
    stayhub_session: JSON.stringify({
      token: 'tok-123',
      name: 'Laura Huésped',
      email,
      role,
      expiresAt: Date.now() + 60_000,
    }),
  };
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    },
    configurable: true,
  });
}

function assert(cond: unknown, message: string): void {
  if (!cond) {
    throw new Error(message);
  }
}

export async function runMessagesSpec(): Promise<void> {
  assert(MESSAGES_POLL_INTERVAL_MS <= 10_000, 'El intervalo de actualización automática debe ser <= 10 s');
  assert(MAX_MESSAGE_LENGTH === 1000, 'El máximo por mensaje debe ser 1000 caracteres');

  // CA6: validación de mensaje vacío, solo espacios o > 1000 caracteres
  assert(validateMessageText('') !== null, 'Debe rechazar mensaje vacío');
  assert(validateMessageText('   \n\t ') !== null, 'Debe rechazar mensaje de solo espacios');
  assert(validateMessageText('a'.repeat(1001)) !== null, 'Debe rechazar mensaje > 1000 caracteres');
  assert(validateMessageText('Hola, ¿tienen disponibilidad?') === null, 'Debe aceptar mensaje válido');

  stubSession();

  const summary: ConversationSummary = {
    id: 'conv-1',
    listingId: 'list-1',
    listingTitle: 'Apartamento Laureles',
    guestId: 'u-guest-1',
    guestName: 'Laura Huésped',
    hostId: 'u-host-1',
    hostName: 'Carlos Anfitrión',
    counterpartName: 'Carlos Anfitrión',
    unreadCount: 1,
    createdAt: '2026-11-12T10:00:00.000Z',
    updatedAt: '2026-11-12T10:05:00.000Z',
  };

  let fetchedUrls: string[] = [];
  (globalThis as any).fetch = async (url: string, init?: RequestInit) => {
    fetchedUrls.push(`${init?.method ?? 'GET'} ${url}`);
    if (url.startsWith('/api/conversations?')) {
      return new Response(
        JSON.stringify({
          data: [summary],
          unreadConversations: 1,
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        }),
        { status: 200 },
      );
    }
    if (url.startsWith('/api/conversations/conv-1/messages')) {
      return new Response(
        JSON.stringify({
          conversation: { ...summary, unreadCount: 0 },
          messages: {
            data: [
              {
                id: 'msg-2',
                conversationId: 'conv-1',
                senderId: 'u-guest-1',
                senderRole: 'HUESPED',
                senderName: 'Laura Huésped',
                content: 'Gracias por responder',
                createdAt: '2026-11-12T10:06:00.000Z',
              },
            ],
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        }),
        { status: 201 },
      );
    }
    if (url.startsWith('/api/conversations/conv-1')) {
      return new Response(
        JSON.stringify({
          conversation: { ...summary, unreadCount: 0 },
          messages: {
            data: [
              {
                id: 'msg-1',
                conversationId: 'conv-1',
                senderId: 'u-host-1',
                senderRole: 'ANFITRION',
                senderName: 'Carlos Anfitrión',
                content: '¡Hola! Sí está disponible.',
                createdAt: '2026-11-12T10:05:00.000Z',
                readAt: '2026-11-12T10:05:30.000Z',
              },
            ],
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ message: 'No encontrado' }), { status: 404 });
  };

  const component = new MessagesComponent();
  await component.loadInbox();
  assert(component.conversations.length === 1, 'Debe cargar la bandeja paginada');
  assert(component.unreadConversations === 1, 'Debe reflejar conversaciones sin leer');

  await component.selectConversation('conv-1');
  assert(component.messages.length === 1, 'Debe cargar mensajes al abrir conversación');

  component.draftMessage = '   ';
  await component.sendMessage();
  assert(component.sendValidationError.length > 0, 'Debe mostrar motivo junto al campo si está vacío');
  assert(!fetchedUrls.some((u) => u.startsWith('POST ')), 'No debe enviar si la validación falla');

  component.draftMessage = 'Gracias por responder';
  await component.sendMessage();
  assert(component.draftMessage === '', 'Debe limpiar borrador tras envío exitoso');
  assert(component.messages[0].content === 'Gracias por responder', 'Debe actualizar la lista de mensajes');
}
