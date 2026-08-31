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
      relations: ['course', 'technicalSheets', 'lessonDocuments'],
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

    const isTeacher = user.role === UserRole.ADMIN || user.role === UserRole.SYSADMIN;

    if (!isTeacher && !lesson.isPublished) {
      throw new NotFoundException('Clase no encontrada');
    }

    // Fetch all lessons of this course to determine syllabus & order
    const allCourseLessons = await this.lessonRepository.find({
      where: { courseId: lesson.courseId },
      relations: ['quizQuestions'],
      order: { orderNumber: 'ASC' },
    });

    const allLessons = isTeacher
      ? allCourseLessons
      : allCourseLessons.filter((l) => l.isPublished !== false);

    // Fetch user progress for all lessons in this course
    const userProgressList = await this.userProgressRepository.find({
      where: { userId: user.id },
    });

    const progressMap = new Map<string, UserProgress>();
    userProgressList.forEach((p) => progressMap.set(p.lessonId, p));

    const now = new Date();
    const isScheduledFuture = lesson.availableAt && now < new Date(lesson.availableAt);

    if (!isTeacher && isScheduledFuture) {
      throw new ForbiddenException(
        `Esta clase no está disponible todavía. Estará habilitada a partir del ${new Date(lesson.availableAt).toLocaleString('es-AR')}.`,
      );
    }

    // Build sidebar syllabus for easy navigation and compute unlocked status
    let prevUnlockedNext = false;
    const syllabus = allLessons.map((l, index) => {
      const p = progressMap.get(l.id);
      const isFuture = l.availableAt && now < new Date(l.availableAt);
      const hasNoQuiz = !l.quizQuestions || l.quizQuestions.length === 0;

      // Automatically downgrade from COMPLETED to AVAILABLE if a quiz was added and hasn't been evaluated
      if (p && !hasNoQuiz && p.status === ProgressStatus.COMPLETED && p.score === null) {
        p.status = ProgressStatus.AVAILABLE;
      }

      let s: ProgressStatus = ProgressStatus.LOCKED;
      if (isTeacher) {
        s = p?.status === ProgressStatus.COMPLETED ? ProgressStatus.COMPLETED : ProgressStatus.AVAILABLE;
      } else if (isFuture) {
        s = ProgressStatus.LOCKED;
      } else if (p?.status === ProgressStatus.COMPLETED) {
        s = ProgressStatus.COMPLETED;
      } else if (index === 0) {
        s = p?.status || ProgressStatus.AVAILABLE;
      } else if (prevUnlockedNext) {
        s = p?.status || ProgressStatus.AVAILABLE;
      } else if (p?.status === ProgressStatus.AVAILABLE) {
        s = ProgressStatus.AVAILABLE;
      }

      prevUnlockedNext =
        s === ProgressStatus.COMPLETED ||
        (hasNoQuiz && (s === ProgressStatus.AVAILABLE || !isFuture));

      return {
        id: l.id,
        title: l.title,
        orderNumber: l.orderNumber,
        meetUrl: l.meetUrl || null,
        presentationUrl: l.presentationUrl || null,
        presentationFilename: l.presentationFilename || null,
        availableAt: l.availableAt || null,
        isPublished: l.isPublished,
        hasQuiz: !hasNoQuiz,
        status: s,
        score: p?.score ?? null,
      };
    });

    const targetSyllabusItem = syllabus.find((s) => s.id === lesson.id);
    const calculatedStatus = isTeacher
      ? ProgressStatus.AVAILABLE
      : (targetSyllabusItem ? targetSyllabusItem.status : ProgressStatus.LOCKED);

    if (!isTeacher && calculatedStatus === ProgressStatus.LOCKED) {
      throw new ForbiddenException(
        'Esta clase está bloqueada. Debes completar las clases anteriores para desbloquearla.',
      );
    }

    // Fetch quiz questions directly
    const quizQuestions = await this.quizQuestionRepository.find({
      where: { lessonId: lesson.id },
    });

    const hasNoQuiz = quizQuestions.length === 0;

    // Check progress of target lesson
    let targetProgress = progressMap.get(lesson.id);

    if (!isTeacher) {
      if (!targetProgress) {
        targetProgress = this.userProgressRepository.create({
          userId: user.id,
          lessonId: lesson.id,
          status: hasNoQuiz ? ProgressStatus.COMPLETED : ProgressStatus.AVAILABLE,
          completedAt: hasNoQuiz ? new Date() : null,
        });
        await this.userProgressRepository.save(targetProgress);
        progressMap.set(lesson.id, targetProgress);
      } else if (hasNoQuiz && targetProgress.status !== ProgressStatus.COMPLETED) {
        targetProgress.status = ProgressStatus.COMPLETED;
        targetProgress.completedAt = new Date();
        await this.userProgressRepository.save(targetProgress);
      } else if (!hasNoQuiz && targetProgress.status === ProgressStatus.COMPLETED && targetProgress.score === null) {
        // Teacher added a quiz after the student had already completed the lesson just by viewing it
        targetProgress.status = ProgressStatus.AVAILABLE;
        targetProgress.completedAt = null;
        await this.userProgressRepository.save(targetProgress);
      }

      // If this lesson has no quiz, automatically ensure the next lesson is unlocked
      if (hasNoQuiz) {
        const currentIdx = allLessons.findIndex((l) => l.id === lesson.id);
        if (currentIdx >= 0 && currentIdx < allLessons.length - 1) {
          const nextL = allLessons[currentIdx + 1];
          let nextP = progressMap.get(nextL.id);
          if (!nextP) {
            nextP = this.userProgressRepository.create({
              userId: user.id,
              lessonId: nextL.id,
              status: ProgressStatus.AVAILABLE,
            });
            await this.userProgressRepository.save(nextP);
            progressMap.set(nextL.id, nextP);
          } else if (nextP.status === ProgressStatus.LOCKED) {
            nextP.status = ProgressStatus.AVAILABLE;
            await this.userProgressRepository.save(nextP);
          }
        }
      }
    }

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
      presentationUrl: lesson.presentationUrl || null,
      presentationFilename: lesson.presentationFilename || null,
      availableAt: lesson.availableAt || null,
      isPublished: lesson.isPublished,
      hasQuiz: !hasNoQuiz,
      title: lesson.title,
      content: lesson.content,
      orderNumber: lesson.orderNumber,
      status: targetProgress ? targetProgress.status : calculatedStatus,
      score: targetProgress?.score ?? null,
      completedAt: targetProgress?.completedAt ?? null,
      savedAnswers: targetProgress?.quizAnswers ?? {},
      attemptsCount: targetProgress?.attemptsCount ?? 0,
      hasViewedContent: targetProgress?.hasViewedContent ?? false,
      hasViewedSheets: targetProgress?.hasViewedSheets ?? false,
      hasViewedDocs: targetProgress?.hasViewedDocs ?? false,
      quizQuestions: questions,
      technicalSheets: lesson.technicalSheets || [],
      lessonDocuments: lesson.lessonDocuments || [],
      syllabus,
    };
  }

  downloadTechnicalSheet(filename: string, res: any) {
    const fs = require('fs');
    const path = require('path');
    
    // Ensure filename doesn't contain path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'uploads', 'technical-sheets', safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('El archivo no existe o fue eliminado');
    }

    return res.sendFile(filePath);
  }

  downloadLessonDocument(filename: string, res: any) {
    const fs = require('fs');
    const path = require('path');
    
    // Ensure filename doesn't contain path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'uploads', 'lesson-documents', safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('El archivo no existe o fue eliminado');
    }

    return res.sendFile(filePath);
  }

  async updateProgress(lessonId: string, user: User, dto: { hasViewedContent?: boolean; hasViewedSheets?: boolean; hasViewedDocs?: boolean }) {
    let progress = await this.userProgressRepository.findOne({
      where: { lessonId, userId: user.id }
    });

    if (!progress) {
      progress = this.userProgressRepository.create({
        lessonId,
        userId: user.id,
        hasViewedContent: dto.hasViewedContent ?? false,
        hasViewedSheets: dto.hasViewedSheets ?? false,
        hasViewedDocs: dto.hasViewedDocs ?? false,
      });
    } else {
      if (dto.hasViewedContent !== undefined) {
        progress.hasViewedContent = dto.hasViewedContent;
      }
      if (dto.hasViewedSheets !== undefined) {
        progress.hasViewedSheets = dto.hasViewedSheets;
      }
      if (dto.hasViewedDocs !== undefined) {
        progress.hasViewedDocs = dto.hasViewedDocs;
      }
    }

    await this.userProgressRepository.save(progress);
    return { success: true, progress };
  }
}
