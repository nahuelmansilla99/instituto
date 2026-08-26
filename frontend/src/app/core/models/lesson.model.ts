import { CourseLessonItem } from './course.model';
import { QuizQuestion } from './quiz.model';

export interface LessonDetail {
  id: string;
  courseId: string;
  courseTitle: string;
  courseMeetUrl?: string | null;
  meetUrl?: string | null;
  presentationUrl?: string | null;
  presentationFilename?: string | null;
  availableAt?: string | null;
  title: string;
  content: string;
  orderNumber: number;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
  score: number | null;
  completedAt: string | null;
  savedAnswers?: Record<string, number>;
  attemptsCount: number;
  hasViewedContent?: boolean;
  hasViewedSheets?: boolean;
  quizQuestions: QuizQuestion[];
  technicalSheets?: any[];
  syllabus: CourseLessonItem[];
}
