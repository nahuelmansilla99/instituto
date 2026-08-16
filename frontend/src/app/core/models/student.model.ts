export interface StudentSummary {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface EnrolledStudentReport {
  enrollmentId: string;
  studentId: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';
  enrolledAt: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  averageScore: number | null;
}

export interface StudentLessonProgressDetail {
  lessonId: string;
  title: string;
  orderNumber: number;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
  score: number | null;
  completedAt: string | null;
}

export interface StudentCourseProgressReport {
  student: {
    id: string;
    name: string;
    email: string;
  };
  course: {
    id: string;
    title: string;
  };
  lessons: StudentLessonProgressDetail[];
}
