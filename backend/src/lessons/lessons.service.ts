import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson, Course, QuizQuestion, UserProgress, ProgressStatus, User, UserRole, CourseEnrollment, EnrollmentStatus } from '../entities';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(QuizQuestion)
    private readonly quizQuestionRepository: Repository<QuizQuestion>,
    @InjectRepository(UserProgress)
    private readonly userProgressRepository: Repository<UserProgress>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
  ) {}

  async findOne(lessonId: string, user: User) {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    // Verify enrollment for students
    if (user.role === UserRole.STUDENT) {
      const enrollment = await this.enrollmentRepository.findOne({
        where: {
          userId: user.id,
          courseId: lesson.courseId,
          status: EnrollmentStatus.ACTIVE,
        },
      });

      if (!enrollment) {
        throw new ForbiddenException('No estás matriculado en este curso. Solicita acceso a tu profesor.');
      }
    }

    // Fetch all lessons of this course to determine syllabus & order
    const allLessons = await this.lessonRepository.find({
      where: { courseId: lesson.courseId },
      order: { orderNumber: 'ASC' },
    });

    // Fetch user progress for all lessons in this course
    const userProgressList = await this.userProgressRepository.find({
      where: { userId: user.id },
    });

    const progressMap = new Map<string, UserProgress>();
    userProgressList.forEach((p) => progressMap.set(p.lessonId, p));

    // Check progress of target lesson
    let targetProgress = progressMap.get(lesson.id);
    const isFirstLesson = allLessons.length > 0 && allLessons[0].id === lesson.id;

    if (!targetProgress && isFirstLesson) {
      // Automatically initialize first lesson as AVAILABLE
      targetProgress = this.userProgressRepository.create({
        userId: user.id,
        lessonId: lesson.id,
        status: ProgressStatus.AVAILABLE,
      });
      await this.userProgressRepository.save(targetProgress);
      progressMap.set(lesson.id, targetProgress);
    }

    const currentStatus = targetProgress ? targetProgress.status : ProgressStatus.LOCKED;

    if (currentStatus === ProgressStatus.LOCKED) {
      throw new ForbiddenException(
        'Esta clase está bloqueada. Debes completar y aprobar los cuestionarios de las clases anteriores para desbloquearla.',
      );
    }

    // Build sidebar syllabus for easy navigation
    const syllabus = allLessons.map((l, index) => {
      const p = progressMap.get(l.id);
      let s = ProgressStatus.LOCKED;
      if (p) {
        s = p.status;
      } else if (index === 0) {
        s = ProgressStatus.AVAILABLE;
      }
      return {
        id: l.id,
        title: l.title,
        orderNumber: l.orderNumber,
        meetUrl: l.meetUrl,
        status: s,
        score: p?.score ?? null,
      };
    });

    // Fetch quiz questions directly
    const quizQuestions = await this.quizQuestionRepository.find({
      where: { lessonId: lesson.id },
    });

    // Quiz questions without correctOptionIndex
    const questions = quizQuestions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
    }));

    return {
      id: lesson.id,
      courseId: lesson.courseId,
      courseTitle: lesson.course?.title || '',
      courseMeetUrl: lesson.course?.meetUrl || null,
      meetUrl: lesson.meetUrl || null,
      title: lesson.title,
      content: lesson.content,
      orderNumber: lesson.orderNumber,
      status: currentStatus,
      score: targetProgress?.score ?? null,
      completedAt: targetProgress?.completedAt ?? null,
      quizQuestions: questions,
      syllabus,
    };
  }
}
