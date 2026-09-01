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
import { ChatbotService, ChatMessage, ChatQuota } from '../../../core/services/chatbot.service';
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
  readonly isLoading = signal<boolean>(false);
  readonly isSending = signal<boolean>(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly quota = signal<ChatQuota | null>(null);
  readonly errorMessage = signal<string | null>(null);

  inputQuestion: string = '';
  private shouldScrollBottom = false;

  readonly quickPrompts = [
    '¿De qué trata este curso y qué aprenderé?',
    '¿Qué conceptos clave se explican en las clases?',
    '¿Qué materiales o documentos están disponibles?',
  ];

  ngOnInit(): void {
    if (this.courseId) {
      this.loadChatData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['courseId'] && !changes['courseId'].firstChange) {
      this.loadChatData();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  toggleChat(): void {
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);
    if (nextState) {
      this.shouldScrollBottom = true;
      if (this.messages().length === 0 && !this.isLoading()) {
        this.loadChatData();
      }
    }
  }

  loadChatData(): void {
    if (!this.courseId) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Cargar cuota
    this.chatbotService.getQuota(this.courseId).subscribe({
      next: (q) => this.quota.set(q),
      error: () => {},
    });

    // Cargar historial
    this.chatbotService.getHistory(this.courseId).subscribe({
      next: (hist) => {
        this.messages.set(hist);
        this.isLoading.set(false);
        this.shouldScrollBottom = true;
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status !== 403) {
          this.errorMessage.set('No se pudo cargar el historial del chat.');
        }
      },
    });
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

    this.chatbotService.askTutor(this.courseId, text).subscribe({
      next: (res) => {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          message: res.reply,
          createdAt: new Date(),
        };
        this.messages.update((list) => [...list, assistantMsg]);
        this.isSending.set(false);
        this.shouldScrollBottom = true;

        if (this.quota()) {
          this.quota.update((q) => (q ? { ...q, remaining: res.remainingQuota, used: q.max - res.remainingQuota } : null));
        }
      },
      error: (err) => {
        this.isSending.set(false);
        const backendMsg = err.error?.message || 'Error al comunicarse con el tutor virtual. Intenta nuevamente.';
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
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (_) {}
  }
}
