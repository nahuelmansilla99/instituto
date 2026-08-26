import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { QuizQuestion } from './quiz-question.entity';
import { UserProgress } from './user-progress.entity';
import { TechnicalSheet } from './technical-sheet.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'order_number', type: 'int' })
  orderNumber: number;

  @Column({ name: 'meet_url', length: 500, nullable: true })
  meetUrl: string;

  @Column({ name: 'presentation_url', length: 500, nullable: true })
  presentationUrl: string;

  @Column({ name: 'presentation_filename', length: 255, nullable: true })
  presentationFilename: string;

  @Column({ name: 'available_at', type: 'timestamp', nullable: true })
  availableAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Course, (course) => course.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => QuizQuestion, (question) => question.lesson)
  quizQuestions: QuizQuestion[];

  @OneToMany(() => UserProgress, (progress) => progress.lesson)
  userProgresses: UserProgress[];

  @OneToMany(() => TechnicalSheet, (ts) => ts.lesson)
  technicalSheets: TechnicalSheet[];

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}
