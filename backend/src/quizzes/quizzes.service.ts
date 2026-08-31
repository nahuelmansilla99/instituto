import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { QuizQuestion } from '../entities/quiz-question.entity';
import { Lesson } from '../entities/lesson.entity';
import { UserProgress, ProgressStatus } from '../entities/user-progress.entity';
import { AnswerItemDto } from './dto/submit-quiz.dto';

export interface QuizEvaluationResult {
  passed: boolean;
  score: number;
  correctCount: number;
  totalCount: number;
  passingThreshold: number;
  message: string;
  nextLessonId?: string | null;
  nextLessonTitle?: string | null;
  questionResults?: { questionId: string; isCorrect: boolean }[];
}

@Injectable()
export class QuizzesService {
  private readonly PASSING_THRESHOLD = 80; // 80% minimum score

  constructor(
    @InjectRepository(QuizQuestion)
    private readonly quizQuestionRepository: Repository<QuizQuestion>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(UserProgress)
    private readonly userProgressRepository: Repository<UserProgress>,
  ) {}

  async evaluateQuiz(
    lessonId: string,
    userId: string,
    answers: AnswerItemDto[],
  ): Promise<QuizEvaluationResult> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['quizQuestions'],
    });

    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    const questions = lesson.quizQuestions;

    if (!questions || questions.length === 0) {
      throw new BadRequestException('Esta lección no contiene preguntas de evaluación');
    }

    // Map submitted answers by questionId
    const submittedMap = new Map<string, number>();
    answers.forEach((ans) => {
      submittedMap.set(ans.questionId, ans.selectedOptionIndex);
    });

    let correctCount = 0;
    const totalCount = questions.length;
    const questionResults: { questionId: string; isCorrect: boolean }[] = [];

    questions.forEach((q) => {
      const selectedIndex = submittedMap.get(q.id);
      const isCorrect = selectedIndex !== undefined && selectedIndex === q.correctOptionIndex;
      questionResults.push({ questionId: q.id, isCorrect });
      if (isCorrect) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalCount) * 100);
    const passed = score >= this.PASSING_THRESHOLD;

    // Retrieve or create current lesson progress
    let userProgress = await this.userProgressRepository.findOne({
      where: { userId, lessonId },
    });

    if (!userProgress) {
      userProgress = this.userProgressRepository.create({
        userId,
        lessonId,
        status: ProgressStatus.AVAILABLE,
      });
    }

    userProgress.attemptsCount = (userProgress.attemptsCount || 0) + 1;

    let nextLessonId: string | null = null;
    let nextLessonTitle: string | null = null;

    if (passed) {
      // Mark current lesson as COMPLETED
      userProgress.status = ProgressStatus.COMPLETED;
      userProgress.score = score;
      userProgress.completedAt = new Date();
      await this.userProgressRepository.save(userProgress);

      // Find next lesson in the course (lowest orderNumber > current orderNumber)
      const nextLesson = await this.lessonRepository.findOne({
        where: {
          courseId: lesson.courseId,
          orderNumber: MoreThan(lesson.orderNumber),
          isPublished: true,
        },
        order: { orderNumber: 'ASC' },
      });

      if (nextLesson) {
        nextLessonId = nextLesson.id;
        nextLessonTitle = nextLesson.title;

        // Unlock next lesson if not already completed
        let nextProgress = await this.userProgressRepository.findOne({
          where: { userId, lessonId: nextLesson.id },
        });

        if (!nextProgress) {
          nextProgress = this.userProgressRepository.create({
            userId,
            lessonId: nextLesson.id,
            status: ProgressStatus.AVAILABLE,
          });
          await this.userProgressRepository.save(nextProgress);
        } else if (nextProgress.status === ProgressStatus.LOCKED) {
          nextProgress.status = ProgressStatus.AVAILABLE;
          await this.userProgressRepository.save(nextProgress);
        }
      }

      return {
        passed: true,
        score,
        correctCount,
        totalCount,
        passingThreshold: this.PASSING_THRESHOLD,
        message: `¡Felicitaciones! Has aprobado el cuestionario con un ${score}% (${correctCount}/${totalCount} correctas).`,
        nextLessonId,
        nextLessonTitle,
      };
    } else {
      // If failed, keep available and save the attempt score
      if (userProgress.status !== ProgressStatus.COMPLETED) {
        userProgress.status = ProgressStatus.AVAILABLE;
        userProgress.score = score;
        await this.userProgressRepository.save(userProgress);
      }

      return {
        passed: false,
        score,
        correctCount,
        totalCount,
        passingThreshold: this.PASSING_THRESHOLD,
        message: `Has obtenido ${score}% (${correctCount}/${totalCount} correctas). Se requiere al menos un ${this.PASSING_THRESHOLD}% para aprobar y desbloquear la siguiente lección.`,
        nextLessonId: null,
        questionResults,
      };
    }
  }

  async saveProgress(
    lessonId: string,
    userId: string,
    answers: AnswerItemDto[],
  ): Promise<void> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    let userProgress = await this.userProgressRepository.findOne({
      where: { userId, lessonId },
    });

    if (!userProgress) {
      userProgress = this.userProgressRepository.create({
        userId,
        lessonId,
        status: ProgressStatus.AVAILABLE,
      });
    }

    // Map submitted answers by questionId
    const submittedMap: Record<string, number> = {};
    answers.forEach((ans) => {
      submittedMap[ans.questionId] = ans.selectedOptionIndex;
    });

    userProgress.quizAnswers = submittedMap;
    await this.userProgressRepository.save(userProgress);
  }
}
