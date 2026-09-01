import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';
import { AiChatConversation } from './ai-chat-conversation.entity';

export enum AiChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity('ai_chat_messages')
@Index(['userId', 'courseId', 'createdAt'])
@Index(['conversationId', 'createdAt'])
export class AiChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid', nullable: true })
  conversationId: string | null;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @Column({
    type: 'enum',
    enum: AiChatRole,
    default: AiChatRole.USER,
  })
  role: AiChatRole;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => AiChatConversation, (conv) => conv.messages, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: AiChatConversation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;
}
