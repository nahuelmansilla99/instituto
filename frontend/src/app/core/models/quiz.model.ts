export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
}

export interface AdminQuizQuestion extends QuizQuestion {
  correctOptionIndex: number;
  lessonId: string;
  createdAt?: string;
}

export interface QuizAnswerSubmission {
  questionId: string;
  selectedOptionIndex: number;
}

export interface QuizEvaluationResponse {
  passed: boolean;
  score: number;
  correctCount: number;
  totalCount: number;
  passingThreshold: number;
  message: string;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
}
