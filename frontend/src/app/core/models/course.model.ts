export interface CourseSummary {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  meetUrl?: string | null;
  hasPresentation?: boolean;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

export interface CourseDetail extends CourseSummary {
  lessons: CourseLessonItem[];
}

export interface CourseLessonItem {
  id: string;
  title: string;
  orderNumber: number;
  meetUrl?: string | null;
  presentationUrl?: string | null;
  presentationFilename?: string | null;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
  score: number | null;
}
