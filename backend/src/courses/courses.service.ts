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

      return {
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnailUrl,
        meetUrl: course.meetUrl,
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

    // Fetch lessons directly from repository
    const sortedLessons = await this.lessonRepository.find({
      where: { courseId },
      order: { orderNumber: 'ASC' },
    });

    // Fetch user progress for all lessons
    const userProgressList = await this.userProgressRepository.find({
      where: { userId: user.id },
    });

    const progressMap = new Map<string, UserProgress>();
    userProgressList.forEach((p) => progressMap.set(p.lessonId, p));

    // Determine status for each lesson
    const lessonsWithStatus = sortedLessons.map((lesson, index) => {
      const progress = progressMap.get(lesson.id);
      let status: ProgressStatus = ProgressStatus.LOCKED;

      if (progress) {
        status = progress.status;
      } else if (index === 0) {
        // First lesson is always AVAILABLE by default
        status = ProgressStatus.AVAILABLE;
      }

      return {
        id: lesson.id,
        title: lesson.title,
        orderNumber: lesson.orderNumber,
        meetUrl: lesson.meetUrl,
        status,
        score: progress?.score ?? null,
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
