import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChatbotService,
  ChatMessage,
  ChatQuota,
  ChatConversation,
} from '../../../core/services/chatbot.service';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-course-tutor-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  templateUrl: './course-tutor-chat.component.html',
  styleUrl: './course-tutor-chat.component.css',
})
export class CourseTutorChatComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input({ required: true }) courseId!: string;
  @Input() courseTitle: string = 'este curso';

  private readonly chatbotService = inject(ChatbotService);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  readonly isOpen = signal<boolean>(false);
  readonly activeView = signal<'chat' | 'history'>('chat');
  readonly isLoading = signal<boolean>(false);
  readonly isLoadingConversations = signal<boolean>(false);
  readonly isSending = signal<boolean>(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly conversations = signal<ChatConversation[]>([]);
  readonly currentConversationId = signal<string | null>(null);
  readonly currentConversationTitle = signal<string | null>(null);
  readonly quota = signal<ChatQuota | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly searchQuery = signal<string>('');

  inputQuestion: string = '';
  private shouldScrollBottom = false;

  readonly quickPrompts = [
    '¿De qué trata este curso y qué aprenderé?',
    '¿Qué conceptos clave se explican en las clases?',
    '¿Qué materiales o documentos están disponibles?',
  ];

  ngOnInit(): void {
    if (this.courseId) {
      this.loadInitialData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['courseId'] && !changes['courseId'].firstChange) {
      this.startNewChat();
      this.loadInitialData();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom && this.activeView() === 'chat') {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  toggleChat(): void {
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);
    if (nextState) {
      this.shouldScrollBottom = true;
      if (!this.quota()) {
        this.loadQuota();
      }
      if (this.conversations().length === 0 && !this.isLoadingConversations()) {
        this.loadConversations();
      }
    }
  }

  loadInitialData(): void {
    this.loadQuota();
    this.loadConversations(undefined, true);
  }

  loadQuota(): void {
    if (!this.courseId) return;
    this.chatbotService.getQuota(this.courseId).subscribe({
      next: (q) => this.quota.set(q),
      error: () => {},
    });
  }

  loadConversations(search?: string, autoOpenLatest: boolean = false): void {
    if (!this.courseId) return;
    this.isLoadingConversations.set(true);

    this.chatbotService.getConversations(this.courseId, search).subscribe({
      next: (convs) => {
        this.conversations.set(convs);
        this.isLoadingConversations.set(false);

        if (autoOpenLatest && convs.length > 0 && !this.currentConversationId()) {
          this.selectConversation(convs[0]);
        }
      },
      error: () => {
        this.isLoadingConversations.set(false);
      },
    });
  }

  startNewChat(): void {
    this.currentConversationId.set(null);
    this.currentConversationTitle.set(null);
    this.messages.set([]);
    this.errorMessage.set(null);
    this.activeView.set('chat');
    this.inputQuestion = '';
  }

  openHistoryView(): void {
    this.activeView.set('history');
    this.loadConversations(this.searchQuery());
  }

  openChatView(): void {
    this.activeView.set('chat');
    this.shouldScrollBottom = true;
  }

  selectConversation(conv: ChatConversation): void {
    this.currentConversationId.set(conv.id);
    this.currentConversationTitle.set(conv.title);
    this.activeView.set('chat');
    this.loadConversationMessages(conv.id);
  }

  loadConversationMessages(conversationId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.chatbotService.getConversationMessages(this.courseId, conversationId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.isLoading.set(false);
        this.shouldScrollBottom = true;
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status !== 403) {
          this.errorMessage.set('No se pudieron cargar los mensajes de esta conversación.');
        }
      },
    });
  }

  deleteConversation(conv: ChatConversation, event: MouseEvent): void {
    event.stopPropagation();
    const confirmDelete = window.confirm(`¿Deseas eliminar la conversación "${conv.title}"?`);
    if (!confirmDelete) return;

    this.chatbotService.deleteConversation(this.courseId, conv.id).subscribe({
      next: () => {
        // Si la que se borró es la actualmente abierta, reiniciar a nuevo chat
        if (this.currentConversationId() === conv.id) {
          this.startNewChat();
        }
        // Recargar lista de conversaciones
        this.loadConversations(this.searchQuery());
      },
      error: () => {
        this.errorMessage.set('No se pudo eliminar la conversación.');
      },
    });
  }

  onSearchChange(searchTerm: string): void {
    this.searchQuery.set(searchTerm);
    this.loadConversations(searchTerm);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.loadConversations();
  }

  sendQuickPrompt(promptText: string): void {
    this.inputQuestion = promptText;
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.inputQuestion.trim();
    if (!text || this.isSending()) return;

    if (text.length > 400) {
      this.errorMessage.set('La pregunta no puede superar los 400 caracteres.');
      return;
    }

    if (this.quota() && this.quota()!.remaining <= 0) {
      this.errorMessage.set('Has alcanzado tu límite diario de consultas. Vuelve mañana a las 00:00.');
      return;
    }

    // Agregar mensaje del usuario a la lista inmediatamente
    const userMsg: ChatMessage = { role: 'user', message: text, createdAt: new Date() };
    this.messages.update((list) => [...list, userMsg]);
    this.inputQuestion = '';
    this.isSending.set(true);
    this.errorMessage.set(null);
    this.shouldScrollBottom = true;

    const convId = this.currentConversationId() || undefined;

    this.chatbotService.askTutor(this.courseId, text, convId).subscribe({
      next: (res) => {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          message: res.reply,
          createdAt: new Date(),
        };
        this.messages.update((list) => [...list, assistantMsg]);
        this.isSending.set(false);
        this.shouldScrollBottom = true;

        // Si era una conversación nueva, vincular el nuevo ID y título
        if (!this.currentConversationId()) {
          this.currentConversationId.set(res.conversationId);
          this.currentConversationTitle.set(res.conversationTitle);
        }

        // Actualizar cuota
        if (this.quota()) {
          this.quota.update((q) =>
            q ? { ...q, remaining: res.remainingQuota, used: q.max - res.remainingQuota } : null,
          );
        }

        // Actualizar listado de conversaciones en segundo plano
        this.loadConversations(this.searchQuery());
      },
      error: (err) => {
        this.isSending.set(false);
        const backendMsg =
          err.error?.message || 'Error al comunicarse con el tutor virtual. Intenta nuevamente.';
        this.errorMessage.set(backendMsg);
        this.shouldScrollBottom = true;
      },
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (_) {}
  }
}
