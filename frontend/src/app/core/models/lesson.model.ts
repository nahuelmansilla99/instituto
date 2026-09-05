import { CourseLessonItem } from './course.model';
import { QuizQuestion, QuizQuestionResult } from './quiz.model';

export interface LessonDetail {
  id: string;
  courseId: string;
  courseTitle: string;
  courseMeetUrl?: string | null;
  meetUrl?: string | null;
  presentationUrl?: string | null;
  presentationFilename?: string | null;
  availableAt?: string | null;
  isPublished?: boolean;
  title: string;
  content?: string;
  orderNumber: number;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
  score: number | null;
  completedAt: string | null;
  savedAnswers?: Record<string, number>;
  attemptsCount: number;
  hasViewedContent?: boolean;
  hasViewedSheets?: boolean;
  hasViewedDocs?: boolean;
  quizQuestions: QuizQuestion[];
  questionResults?: QuizQuestionResult[];
  technicalSheets?: any[];
  lessonDocuments?: any[];
  syllabus: CourseLessonItem[];
}
