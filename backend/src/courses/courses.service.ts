import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, Lesson, User, UserRole, UserProgress, ProgressStatus, CourseEnrollment, EnrollmentStatus } from '../entities';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(UserProgress)
    private readonly userProgressRepository: Repository<UserProgress>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
  ) {}

  async findAll(user?: User) {
    let courses = await this.courseRepository.find({
      order: { createdAt: 'ASC' },
    });

    const allLessons = await this.lessonRepository.find();

    if (!user) {
      return [];
    }

    // If student, filter ONLY enrolled courses
    if (user.role === UserRole.STUDENT) {
      const enrollments = await this.enrollmentRepository.find({
        where: { userId: user.id, status: EnrollmentStatus.ACTIVE },
      });
      const enrolledCourseIds = enrollments.map((e) => e.courseId);
      courses = courses.filter((c) => enrolledCourseIds.includes(c.id));
    }

    const userProgressList = await this.userProgressRepository.find({
      where: { userId: user.id },
    });

    const progressMap = new Map<string, ProgressStatus>();
    userProgressList.forEach((p) => progressMap.set(p.lessonId, p.status));

    return courses.map((course) => {
      const courseLessons = allLessons.filter((l) => l.courseId === course.id);
      const totalLessons = courseLessons.length;
      const completedLessons = courseLessons.filter(
        (lesson) => progressMap.get(lesson.id) === ProgressStatus.COMPLETED,
      ).length;

      const progressPercentage =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      const hasPresentation = courseLessons.some((l) => !!l.presentationUrl);

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        meetUrl: course.meetUrl,
        hasPresentation,
        totalLessons,
        completedLessons,
        progressPercentage,
      };
    });
  }

  async findOne(courseId: string, user: User) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    // If student, verify enrollment
    if (user.role === UserRole.STUDENT) {
      const enrollment = await this.enrollmentRepository.findOne({
        where: { userId: user.id, courseId, status: EnrollmentStatus.ACTIVE },
      });
      if (!enrollment) {
        throw new ForbiddenException('No estás matriculado en este curso. Solicita acceso a tu profesor.');
      }
    }

    // Fetch lessons directly from repository with quiz questions
    const sortedLessons = await this.lessonRepository.find({
      where: { courseId },
      relations: ['quizQuestions', 'technicalSheets', 'lessonDocuments'],
      order: { orderNumber: 'ASC' },
    });

    // Fetch user progress for all lessons
    const userProgressList = await this.userProgressRepository.find({
      where: { userId: user.id },
    });

    const progressMap = new Map<string, UserProgress>();
    userProgressList.forEach((p) => progressMap.set(p.lessonId, p));

    // Determine status for each lesson
    const now = new Date();
    let previousLessonUnlockedNext = false;

    const lessonsWithStatus = sortedLessons.map((lesson, index) => {
      const progress = progressMap.get(lesson.id);
      const isFutureScheduled = lesson.availableAt && now < new Date(lesson.availableAt);
      const hasNoQuiz = !lesson.quizQuestions || lesson.quizQuestions.length === 0;

      let status: ProgressStatus = ProgressStatus.LOCKED;

      if (user.role === UserRole.ADMIN || user.role === UserRole.SYSADMIN) {
        status = progress?.status === ProgressStatus.COMPLETED ? ProgressStatus.COMPLETED : ProgressStatus.AVAILABLE;
      } else if (isFutureScheduled) {
        // Future scheduled release
        status = ProgressStatus.LOCKED;
      } else if (progress?.status === ProgressStatus.COMPLETED) {
        status = ProgressStatus.COMPLETED;
      } else if (index === 0) {
        // First lesson is always AVAILABLE if not completed and not future scheduled
        status = progress?.status || ProgressStatus.AVAILABLE;
      } else if (previousLessonUnlockedNext) {
        // Previous lesson was passed or did not require a quiz
        status = progress?.status || ProgressStatus.AVAILABLE;
      } else if (progress?.status === ProgressStatus.AVAILABLE) {
        status = ProgressStatus.AVAILABLE;
      }

      // Check if this lesson allows the subsequent lesson to unlock
      // It allows unlock if:
      // 1. It is completed, OR
      // 2. It has no quiz questions AND is available (so students aren't blocked by missing exams)
      previousLessonUnlockedNext =
        status === ProgressStatus.COMPLETED ||
        (hasNoQuiz && (status === ProgressStatus.AVAILABLE || !isFutureScheduled));

      return {
        id: lesson.id,
        title: lesson.title,
        orderNumber: lesson.orderNumber,
        meetUrl: lesson.meetUrl || null,
        presentationUrl: lesson.presentationUrl || null,
        presentationFilename: lesson.presentationFilename || null,
        availableAt: lesson.availableAt || null,
        hasQuiz: !hasNoQuiz,
        status,
        score: progress?.score ?? null,
        technicalSheets: lesson.technicalSheets || [],
        lessonDocuments: lesson.lessonDocuments || [],
      };
    });

    const totalLessons = sortedLessons.length;
    const completedLessons = lessonsWithStatus.filter(
      (l) => l.status === ProgressStatus.COMPLETED,
    ).length;
    const progressPercentage =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      meetUrl: course.meetUrl,
      totalLessons,
      completedLessons,
      progressPercentage,
      lessons: lessonsWithStatus,
    };
  }
}
