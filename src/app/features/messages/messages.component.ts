import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { getActiveSession } from '../../core/guards/auth.guard';
import {
  ConversationDetailResponse,
  ConversationMessage,
  ConversationSummary,
  ConversationsPage,
  MAX_MESSAGE_LENGTH,
  MESSAGES_POLL_INTERVAL_MS,
  formatMessageDateTime,
  validateMessageText,
} from '../../shared/models/messages.model';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="messages-shell">
      <header class="page-header">
        <div>
          <h1>Mensajes</h1>
          <p class="subtitle">Conversaciones directas dentro de la plataforma sobre tus alojamientos y reservas.</p>
        </div>
        <span class="unread-badge" *ngIf="unreadConversations > 0" aria-live="polite">
          {{ unreadConversations }} {{ unreadConversations === 1 ? 'conversación sin leer' : 'conversaciones sin leer' }}
        </span>
      </header>

      <div class="alert error" *ngIf="inboxError" role="alert">{{ inboxError }}</div>

      <div class="inbox-grid">
        <aside class="inbox-panel" aria-label="Bandeja de conversaciones">
          <div class="panel-top">
            <h2>Bandeja</h2>
            <span class="total-count" *ngIf="totalConversations > 0">{{ totalConversations }}</span>
          </div>

          <p class="muted-state" *ngIf="loadingInbox && conversations.length === 0">Cargando conversaciones…</p>

          <div class="empty-inbox" *ngIf="!loadingInbox && conversations.length === 0">
            <p>No tienes conversaciones todavía.</p>
            <a routerLink="/listings" class="link-action" *ngIf="isGuest">Explorar alojamientos</a>
          </div>

          <ul class="conv-list" *ngIf="conversations.length > 0">
            <li *ngFor="let conv of conversations" [class.active]="selectedId === conv.id" [class.unread]="conv.unreadCount > 0">
              <button type="button" class="conv-item" (click)="selectConversation(conv.id)">
                <div class="conv-head">
                  <strong class="counterpart">{{ conv.counterpartName }}</strong>
                  <span class="time">{{ formatDate(conv.updatedAt) }}</span>
                </div>
                <span class="listing-name">{{ conv.listingTitle }}</span>
                <div class="conv-foot">
                  <span class="preview">{{ conv.lastMessage?.content || 'Sin mensajes todavía' }}</span>
                  <span class="pill-unread" *ngIf="conv.unreadCount > 0">{{ conv.unreadCount }}</span>
                </div>
              </button>
            </li>
          </ul>

          <div class="pagination" *ngIf="inboxTotalPages > 1" aria-label="Paginación de bandeja">
            <button type="button" class="page-btn" [disabled]="inboxPage <= 1" (click)="goToInboxPage(inboxPage - 1)">
              Anterior
            </button>
            <span>Página {{ inboxPage }} de {{ inboxTotalPages }}</span>
            <button type="button" class="page-btn" [disabled]="inboxPage >= inboxTotalPages" (click)="goToInboxPage(inboxPage + 1)">
              Siguiente
            </button>
          </div>
        </aside>

        <section class="thread-panel" aria-label="Conversación seleccionada">
          <div class="empty-thread" *ngIf="!selectedId && !loadingThread">
            <h2>Selecciona una conversación</h2>
            <p>Elige una conversación de tu bandeja para leer los mensajes y responder.</p>
          </div>

          <p class="muted-state" *ngIf="loadingThread && !activeConversation">Cargando mensajes…</p>

          <div class="alert error" *ngIf="threadError" role="alert">{{ threadError }}</div>

          <ng-container *ngIf="activeConversation as active">
            <header class="thread-header">
              <div>
                <h2>{{ active.counterpartName }}</h2>
                <a [routerLink]="['/listings', active.listingId]" class="thread-listing">{{ active.listingTitle }}</a>
              </div>
              <span class="live-indicator" title="Actualización automática cada pocos segundos">Actualización automática</span>
            </header>

            <div class="messages-pagination" *ngIf="messagesTotalPages > 1" aria-label="Paginación de mensajes">
              <button
                type="button"
                class="page-btn"
                [disabled]="messagesPage <= 1"
                (click)="goToMessagesPage(messagesPage - 1)"
              >
                Más recientes
              </button>
              <span>Página {{ messagesPage }} de {{ messagesTotalPages }}</span>
              <button
                type="button"
                class="page-btn"
                [disabled]="messagesPage >= messagesTotalPages"
                (click)="goToMessagesPage(messagesPage + 1)"
              >
                Anteriores
              </button>
            </div>

            <div class="messages-list" aria-live="polite">
              <p class="muted-state" *ngIf="messages.length === 0">Aún no hay mensajes en esta conversación.</p>

              <article
                *ngFor="let msg of messages"
                class="message-bubble"
                [class.mine]="isMyMessage(msg)"
              >
                <div class="message-meta">
                  <strong>{{ msg.senderName }}</strong>
                  <time [attr.datetime]="msg.createdAt">{{ formatDate(msg.createdAt) }}</time>
                </div>
                <p class="message-body">{{ msg.content }}</p>
              </article>
            </div>

            <form class="composer" (ngSubmit)="sendMessage()" novalidate>
              <label for="message-draft" class="sr-only">Escribe un mensaje</label>
              <textarea
                id="message-draft"
                name="draftMessage"
                rows="3"
                [attr.maxlength]="maxMessageLength + 10"
                [(ngModel)]="draftMessage"
                (ngModelChange)="onDraftChange()"
                placeholder="Escribe tu mensaje aquí…"
                [disabled]="sending"
              ></textarea>
              <div class="composer-footer">
                <div class="composer-feedback">
                  <span class="char-count" [class.over]="draftMessage.length > maxMessageLength">
                    {{ draftMessage.length }} / {{ maxMessageLength }}
                  </span>
                  <p class="field-error" *ngIf="sendValidationError" role="alert">{{ sendValidationError }}</p>
                  <p class="field-error" *ngIf="sendServerError" role="alert">{{ sendServerError }}</p>
                </div>
                <button type="submit" class="send-btn" [disabled]="sending">
                  {{ sending ? 'Enviando…' : 'Enviar mensaje' }}
                </button>
              </div>
            </form>
          </ng-container>
        </section>
      </div>
    </section>
  `,
  styles: [
    `
      .messages-shell { max-width: 1120px; margin: 0 auto; padding: 12px 0 40px; }
      .page-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 20px; }
      .page-header h1 { margin: 0; font-size: 1.85rem; letter-spacing: -0.02em; }
      .subtitle { margin: 4px 0 0; color: #6e6e73; font-size: 0.94rem; }
      .unread-badge { background: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 0.82rem; padding: 6px 14px; border-radius: 980px; }
      .alert.error { background: #fef2f2; color: #b42318; border: 1px solid #fecaca; padding: 12px 16px; border-radius: 12px; font-weight: 600; margin-bottom: 16px; }
      .inbox-grid { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 20px; align-items: start; }
      .inbox-panel, .thread-panel { background: #ffffff; border: 1px solid #e5e5ea; border-radius: 18px; overflow: hidden; }
      .panel-top { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid #f0f0f2; }
      .panel-top h2 { margin: 0; font-size: 1.05rem; }
      .total-count { font-size: 0.78rem; font-weight: 700; color: #515154; background: #f5f5f7; padding: 2px 9px; border-radius: 999px; }
      .muted-state { padding: 18px; margin: 0; color: #6e6e73; font-size: 0.9rem; }
      .empty-inbox, .empty-thread { padding: 28px 20px; text-align: center; color: #6e6e73; }
      .empty-thread h2 { margin: 0 0 8px; color: #1d1d1f; font-size: 1.15rem; }
      .link-action { display: inline-block; margin-top: 8px; color: #0071e3; font-weight: 600; text-decoration: none; }
      .conv-list { list-style: none; margin: 0; padding: 0; }
      .conv-list li + li { border-top: 1px solid #f2f2f5; }
      .conv-list li.active { background: #f2f7ff; }
      .conv-list li.unread .counterpart { font-weight: 700; }
      .conv-item { width: 100%; text-align: left; background: none; border: none; padding: 14px 18px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; font-family: inherit; }
      .conv-item:hover { background: #f8f9fb; }
      .conv-head { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
      .counterpart { font-size: 0.94rem; color: #1d1d1f; }
      .time { font-size: 0.72rem; color: #86868b; white-space: nowrap; }
      .listing-name { font-size: 0.78rem; color: #0071e3; font-weight: 600; }
      .conv-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .preview { font-size: 0.84rem; color: #515154; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pill-unread { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: #0071e3; color: #ffffff; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .pagination, .messages-pagination { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: #f8fafc; border-top: 1px solid #f0f0f2; font-size: 0.8rem; color: #515154; }
      .messages-pagination { border-top: none; border-bottom: 1px solid #f0f0f2; }
      .page-btn { border: 1px solid #d2d2d7; background: #ffffff; color: #1d1d1f; border-radius: 8px; padding: 4px 10px; font-size: 0.78rem; font-weight: 600; cursor: pointer; }
      .page-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .thread-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #f0f0f2; flex-wrap: wrap; }
      .thread-header h2 { margin: 0 0 2px; font-size: 1.12rem; }
      .thread-listing { color: #0071e3; font-size: 0.85rem; font-weight: 600; text-decoration: none; }
      .live-indicator { font-size: 0.72rem; color: #248a3d; background: #eaf7ee; padding: 4px 10px; border-radius: 999px; font-weight: 600; }
      .messages-list { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; max-height: 460px; overflow-y: auto; background: #fbfbfd; }
      .message-bubble { max-width: 82%; padding: 11px 14px; border-radius: 14px; background: #ffffff; border: 1px solid #e5e5ea; align-self: flex-start; }
      .message-bubble.mine { background: #eff6ff; border-color: #bfdbfe; align-self: flex-end; }
      .message-meta { display: flex; justify-content: space-between; gap: 12px; font-size: 0.75rem; color: #6e6e73; margin-bottom: 4px; }
      .message-meta strong { color: #1d1d1f; }
      .message-body { margin: 0; font-size: 0.93rem; line-height: 1.48; color: #1d1d1f; white-space: pre-wrap; overflow-wrap: anywhere; }
      .composer { padding: 14px 20px 18px; border-top: 1px solid #f0f0f2; background: #ffffff; }
      .composer textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d2d2d7; border-radius: 12px; font-family: inherit; font-size: 0.94rem; resize: vertical; }
      .composer-footer { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-top: 8px; flex-wrap: wrap; }
      .composer-feedback { flex: 1; min-width: 200px; }
      .char-count { font-size: 0.76rem; color: #6e6e73; font-weight: 600; }
      .char-count.over { color: #b42318; }
      .field-error { margin: 4px 0 0; color: #b42318; font-size: 0.84rem; font-weight: 600; }
      .send-btn { border: none; background: #1d1d1f; color: #ffffff; padding: 10px 18px; border-radius: 980px; font-size: 0.88rem; font-weight: 600; cursor: pointer; }
      .send-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
      @media (max-width: 820px) { .inbox-grid { grid-template-columns: 1fr; } }
    `,
  ],
})
export class MessagesComponent implements OnInit, OnDestroy {
  readonly maxMessageLength = MAX_MESSAGE_LENGTH;

  conversations: ConversationSummary[] = [];
  unreadConversations = 0;
  inboxPage = 1;
  inboxLimit = 10;
  totalConversations = 0;
  inboxTotalPages = 1;
  loadingInbox = false;
  inboxError = '';

  selectedId = '';
  activeConversation: ConversationSummary | null = null;
  messages: ConversationMessage[] = [];
  messagesPage = 1;
  messagesLimit = 20;
  messagesTotalPages = 1;
  loadingThread = false;
  threadError = '';

  draftMessage = '';
  sendValidationError = '';
  sendServerError = '';
  sending = false;

  private pollTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly route?: ActivatedRoute,
    private readonly router?: Router,
  ) {}

  get isGuest(): boolean {
    return getActiveSession()?.role === 'HUESPED';
  }

  ngOnInit(): void {
    const paramId = this.route?.snapshot.paramMap.get('id');
    const queryId = this.route?.snapshot.queryParamMap.get('conversationId');
    this.selectedId = paramId || queryId || '';

    void this.loadInbox();
    if (this.selectedId) {
      void this.loadConversation(this.selectedId);
    }

    this.pollTimer = setInterval(() => {
      void this.pollUpdates();
    }, MESSAGES_POLL_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  async pollUpdates(): Promise<void> {
    await this.loadInbox(true);
    if (this.selectedId) {
      await this.loadConversation(this.selectedId, true);
    }
  }

  async loadInbox(silent = false): Promise<void> {
    const session = getActiveSession();
    if (!session) return;

    if (!silent) {
      this.loadingInbox = true;
      this.inboxError = '';
    }

    try {
      const response = await fetch(`/api/conversations?page=${this.inboxPage}&limit=${this.inboxLimit}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!response.ok) {
        if (!silent) {
          this.inboxError = 'No fue posible cargar tus conversaciones.';
        }
        return;
      }
      const body = (await response.json()) as ConversationsPage;
      this.conversations = body.data ?? [];
      this.unreadConversations = body.unreadConversations ?? 0;
      this.inboxPage = body.page ?? 1;
      this.totalConversations = body.total ?? this.conversations.length;
      this.inboxTotalPages = body.totalPages ?? 1;
    } catch {
      if (!silent) {
        this.inboxError = 'Error de conexión al consultar tus mensajes.';
      }
    } finally {
      if (!silent) {
        this.loadingInbox = false;
      }
    }
  }

  async selectConversation(conversationId: string): Promise<void> {
    this.selectedId = conversationId;
    this.messagesPage = 1;
    this.sendValidationError = '';
    this.sendServerError = '';
    void this.router?.navigate(['/mensajes', conversationId]);
    await this.loadConversation(conversationId);
    await this.loadInbox(true);
  }

  async loadConversation(conversationId: string, silent = false): Promise<void> {
    const session = getActiveSession();
    if (!session || !conversationId) return;

    if (!silent) {
      this.loadingThread = true;
      this.threadError = '';
    }

    try {
      const response = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}?page=${this.messagesPage}&limit=${this.messagesLimit}`,
        { headers: { Authorization: `Bearer ${session.token}` } },
      );
      if (response.status === 404) {
        this.activeConversation = null;
        this.messages = [];
        this.threadError = 'No encontramos esta conversación.';
        return;
      }
      if (!response.ok) {
        if (!silent) {
          this.threadError = 'No fue posible abrir la conversación.';
        }
        return;
      }
      const body = (await response.json()) as ConversationDetailResponse;
      this.activeConversation = body.conversation;
      this.messages = body.messages?.data ?? [];
      this.messagesPage = body.messages?.page ?? 1;
      this.messagesTotalPages = body.messages?.totalPages ?? 1;
    } catch {
      if (!silent) {
        this.threadError = 'Error de conexión al abrir la conversación.';
      }
    } finally {
      if (!silent) {
        this.loadingThread = false;
      }
    }
  }

  async goToInboxPage(page: number): Promise<void> {
    if (page < 1 || page > this.inboxTotalPages || page === this.inboxPage) return;
    this.inboxPage = page;
    await this.loadInbox();
  }

  async goToMessagesPage(page: number): Promise<void> {
    if (!this.selectedId || page < 1 || page > this.messagesTotalPages || page === this.messagesPage) return;
    this.messagesPage = page;
    await this.loadConversation(this.selectedId);
  }

  onDraftChange(): void {
    this.sendServerError = '';
    if (this.sendValidationError) {
      this.sendValidationError = validateMessageText(this.draftMessage) ?? '';
    }
  }

  async sendMessage(): Promise<void> {
    if (!this.selectedId) return;
    const validationError = validateMessageText(this.draftMessage);
    if (validationError) {
      this.sendValidationError = validationError;
      return;
    }

    const session = getActiveSession();
    if (!session) {
      this.sendServerError = 'Tu sesión expiró. Inicia sesión nuevamente.';
      return;
    }

    this.sending = true;
    this.sendValidationError = '';
    this.sendServerError = '';

    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(this.selectedId)}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: this.draftMessage }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        this.sendServerError = [body?.message].flat().filter(Boolean).join(' ') || 'No fue posible enviar el mensaje.';
        return;
      }

      const detail = body as ConversationDetailResponse;
      this.activeConversation = detail.conversation;
      this.messages = detail.messages?.data ?? [];
      this.messagesPage = detail.messages?.page ?? 1;
      this.messagesTotalPages = detail.messages?.totalPages ?? 1;
      this.draftMessage = '';
      await this.loadInbox(true);
    } catch {
      this.sendServerError = 'Error de conexión al enviar el mensaje.';
    } finally {
      this.sending = false;
    }
  }

  isMyMessage(msg: ConversationMessage): boolean {
    const session = getActiveSession();
    if (!session) return false;
    return msg.senderRole === session.role;
  }

  formatDate(iso: string): string {
    return formatMessageDateTime(iso);
  }
}
