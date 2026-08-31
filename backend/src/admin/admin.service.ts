import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Course, Lesson, QuizQuestion, User, UserRole, UserProgress, CourseEnrollment, EnrollmentStatus, ProgressStatus, TechnicalSheet, LessonDocument } from '../entities';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepo: Repository<Lesson>,
    @InjectRepository(QuizQuestion)
    private readonly quizRepo: Repository<QuizQuestion>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserProgress)
    private readonly progressRepo: Repository<UserProgress>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepo: Repository<CourseEnrollment>,
    @InjectRepository(TechnicalSheet)
    private readonly technicalSheetRepo: Repository<TechnicalSheet>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ----------------------------------------------------
  // GESTIÓN DE CURSOS
  // ----------------------------------------------------
  async getAllCoursesAdmin(): Promise<Course[]> {
    return this.courseRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['lessons'],
    });
  }

  async getCourseAdmin(id: string): Promise<Course> {
    const course = await this.courseRepo.findOne({
      where: { id },
      relations: ['lessons', 'lessons.quizQuestions', 'lessons.technicalSheets', 'lessons.lessonDocuments'],
      order: {
        lessons: {
          orderNumber: 'ASC',
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    return course;
  }

  async createCourse(dto: CreateCourseDto): Promise<Course> {
    const course = this.courseRepo.create({
      title: dto.title.trim(),
      description: dto.description.trim(),
      thumbnailUrl: dto.thumbnailUrl?.trim() || null,
      meetUrl: dto.meetUrl?.trim() || null,
    });

    return this.courseRepo.save(course);
  }

  async updateCourse(id: string, dto: Partial<CreateCourseDto>): Promise<Course> {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    if (dto.title !== undefined) course.title = dto.title.trim();
    if (dto.description !== undefined) course.description = dto.description.trim();
    if (dto.thumbnailUrl !== undefined) course.thumbnailUrl = dto.thumbnailUrl?.trim() || null;
    if (dto.meetUrl !== undefined) course.meetUrl = dto.meetUrl?.trim() || null;

    return this.courseRepo.save(course);
  }

  async deleteCourse(id: string): Promise<{ success: boolean }> {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }
    await this.courseRepo.softRemove(course);
    return { success: true };
  }

  // ----------------------------------------------------
  // GESTIÓN DE LECCIONES / CLASES
  // ----------------------------------------------------
  async createLesson(courseId: string, dto: CreateLessonDto): Promise<Lesson> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    let orderNumber = dto.orderNumber;
    if (!orderNumber) {
      const existingLessons = await this.lessonRepo.find({
        where: { courseId },
        order: { orderNumber: 'DESC' },
        take: 1,
      });
      orderNumber = existingLessons.length > 0 ? existingLessons[0].orderNumber + 1 : 1;
    }

    const lesson = this.lessonRepo.create({
      courseId,
      title: dto.title.trim(),
      content: dto.content.trim(),
      orderNumber,
      meetUrl: dto.meetUrl?.trim() || null,
      presentationUrl: dto.presentationUrl?.trim() || null,
      presentationFilename: dto.presentationFilename?.trim() || null,
      availableAt: dto.availableAt ? new Date(dto.availableAt) : null,
    });

    return this.lessonRepo.save(lesson);
  }

  async updateLesson(id: string, dto: Partial<CreateLessonDto>): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    if (dto.title !== undefined) lesson.title = dto.title.trim();
    if (dto.content !== undefined) lesson.content = dto.content.trim();
    if (dto.orderNumber !== undefined) lesson.orderNumber = dto.orderNumber;
    if (dto.meetUrl !== undefined) lesson.meetUrl = dto.meetUrl?.trim() || null;
    if (dto.presentationUrl !== undefined) lesson.presentationUrl = dto.presentationUrl?.trim() || null;
    if (dto.presentationFilename !== undefined) lesson.presentationFilename = dto.presentationFilename?.trim() || null;
    if (dto.availableAt !== undefined) {
      lesson.availableAt = dto.availableAt ? new Date(dto.availableAt) : null;
    }

    return this.lessonRepo.save(lesson);
  }

  async setLessonPresentation(lessonId: string, file: Express.Multer.File): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Clase no encontrada');
    }

    if (lesson.presentationPublicId) {
      try {
        await this.cloudinaryService.deleteFile(lesson.presentationPublicId);
      } catch (_) {}
    }

    const folder = 'presentations';

    const result = await this.cloudinaryService.uploadFile(file, folder, 'raw');

    lesson.presentationUrl = result.secure_url;
    lesson.presentationPublicId = result.public_id;
    lesson.presentationFilename = file.originalname;

    return this.lessonRepo.save(lesson);
  }

  async deleteLessonPresentation(lessonId: string): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Clase no encontrada');
    }

    if (lesson.presentationPublicId) {
      try {
        await this.cloudinaryService.deleteFile(lesson.presentationPublicId);
      } catch (_) {}
    }

    lesson.presentationUrl = null;
    lesson.presentationPublicId = null;
    lesson.presentationFilename = null;

    return this.lessonRepo.save(lesson);
  }

  async deleteLesson(id: string): Promise<{ success: boolean }> {
    const lesson = await this.lessonRepo.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    if (lesson.presentationPublicId) {
      try {
        await this.cloudinaryService.deleteFile(lesson.presentationPublicId);
      } catch (_) {}
    }

    await this.lessonRepo.softRemove(lesson);
    return { success: true };
  }

  // ----------------------------------------------------
  // FICHAS TÉCNICAS (PDFs COMPLEMENTARIOS)
  // ----------------------------------------------------
  async uploadTechnicalSheet(lessonId: string, file: Express.Multer.File): Promise<TechnicalSheet> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Clase no encontrada');
    }

    const existingSheets = await this.technicalSheetRepo.find({
      where: { lessonId },
      order: { orderNumber: 'DESC' },
      take: 1,
    });
    const nextOrderNumber = existingSheets.length > 0 ? existingSheets[0].orderNumber + 1 : 1;

    const folder = 'technical-sheets';

    const result = await this.cloudinaryService.uploadFile(file, folder, 'raw');

    const sheet = this.technicalSheetRepo.create({
      lessonId,
      originalName: file.originalname,
      fileUrl: result.secure_url,
      filePublicId: result.public_id,
      fileSize: file.size,
      orderNumber: nextOrderNumber,
    });

    return this.technicalSheetRepo.save(sheet);
  }

  async deleteTechnicalSheet(id: string): Promise<{ success: boolean }> {
    const sheet = await this.technicalSheetRepo.findOne({ where: { id } });
    if (!sheet) {
      throw new NotFoundException('Ficha técnica no encontrada');
    }

    if (sheet.filePublicId) {
      try {
        await this.cloudinaryService.deleteFile(sheet.filePublicId);
      } catch (_) {}
    }

    await this.technicalSheetRepo.remove(sheet);
    return { success: true };
  }

  // ----------------------------------------------------
  // DOCUMENTACIÓN DE LA CLASE (PDFs IMPORTANTES)
  // ----------------------------------------------------
  async uploadLessonDocument(lessonId: string, file: Express.Multer.File): Promise<LessonDocument> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Clase no encontrada');
    }

    const existingDocs = await this.lessonRepo.manager.find(LessonDocument, {
      where: { lessonId },
      order: { orderNumber: 'DESC' },
      take: 1,
    });
    const nextOrderNumber = existingDocs.length > 0 ? existingDocs[0].orderNumber + 1 : 1;

    const folder = 'lesson-documents';

    const result = await this.cloudinaryService.uploadFile(file, folder, 'raw');

    const doc = this.lessonRepo.manager.create(LessonDocument, {
      lessonId,
      originalName: file.originalname,
      fileUrl: result.secure_url,
      filePublicId: result.public_id,
      fileSize: file.size,
      orderNumber: nextOrderNumber,
    });

    return this.lessonRepo.manager.save(doc);
  }

  async deleteLessonDocument(id: string): Promise<{ success: boolean }> {
    const doc = await this.lessonRepo.manager.findOne(LessonDocument, { where: { id } });
    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (doc.filePublicId) {
      try {
        await this.cloudinaryService.deleteFile(doc.filePublicId);
      } catch (_) {}
    }

    await this.lessonRepo.manager.remove(doc);
    return { success: true };
  }

  // ----------------------------------------------------
  // GESTIÓN DE PREGUNTAS DEL CUESTIONARIO
  // ----------------------------------------------------
  async getQuestions(lessonId: string): Promise<QuizQuestion[]> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }
    return this.quizRepo.find({
      where: { lessonId },
      order: { createdAt: 'ASC' },
    });
  }

  async createQuestion(lessonId: string, dto: CreateQuestionDto): Promise<QuizQuestion> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    if (dto.correctOptionIndex < 0 || dto.correctOptionIndex >= dto.options.length) {
      throw new BadRequestException('El índice de la opción correcta está fuera del rango de opciones proporcionadas');
    }

    const question = this.quizRepo.create({
      lessonId,
      questionText: dto.questionText.trim(),
      options: dto.options.map((o) => o.trim()),
      correctOptionIndex: dto.correctOptionIndex,
    });

    return this.quizRepo.save(question);
  }

  async updateQuestion(id: string, dto: Partial<CreateQuestionDto>): Promise<QuizQuestion> {
    const question = await this.quizRepo.findOne({ where: { id } });
    if (!question) {
      throw new NotFoundException('Pregunta no encontrada');
    }

    if (dto.questionText !== undefined) question.questionText = dto.questionText.trim();
    if (dto.options !== undefined) question.options = dto.options.map((o) => o.trim());
    if (dto.correctOptionIndex !== undefined) {
      if (dto.correctOptionIndex < 0 || dto.correctOptionIndex >= question.options.length) {
        throw new BadRequestException('Índice de opción correcta inválido');
      }
      question.correctOptionIndex = dto.correctOptionIndex;
    }

    return this.quizRepo.save(question);
  }

  async deleteQuestion(id: string): Promise<{ success: boolean }> {
    const question = await this.quizRepo.findOne({ where: { id } });
    if (!question) {
      throw new NotFoundException('Pregunta no encontrada');
    }
    await this.quizRepo.remove(question);
    return { success: true };
  }



  // ----------------------------------------------------
  // GESTIÓN DE ALUMNOS POR CURSO (MATRÍCULAS Y NOTAS)
  // ----------------------------------------------------
  async getAllStudents() {
    const students = await this.userRepo.find({
      where: [
        { role: UserRole.STUDENT },
        { role: UserRole.ADMIN },
        { role: UserRole.SYSADMIN },
      ],
      order: { name: 'ASC' },
      select: ['id', 'name', 'email', 'createdAt', 'role'],
    });
    return students;
  }

  async getCourseStudents(courseId: string) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    const courseLessons = await this.lessonRepo.find({
      where: { courseId },
      order: { orderNumber: 'ASC' },
    });
    const totalLessons = courseLessons.length;
    const lessonIds = courseLessons.map((l) => l.id);

    const enrollments = await this.enrollmentRepo.find({
      where: { courseId },
      relations: ['user'],
      order: { enrolledAt: 'DESC' },
      withDeleted: true,
    });

    const studentReports = await Promise.all(
      enrollments.map(async (enr) => {
        const student = enr.user;
        if (!student) return null;

        // Fetch student progress on this course's lessons
        let completedLessons = 0;
        let scoresSum = 0;
        let scoresCount = 0;

        if (lessonIds.length > 0) {
          const progresses = await this.progressRepo.find({
            where: { userId: student.id },
          });

          const courseProgresses = progresses.filter((p) => lessonIds.includes(p.lessonId));
          completedLessons = courseProgresses.filter((p) => p.status === ProgressStatus.COMPLETED).length;

          courseProgresses.forEach((p) => {
            if (p.score !== null && p.score !== undefined) {
              scoresSum += Number(p.score);
              scoresCount++;
            }
          });
        }

        const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        const averageScore = scoresCount > 0 ? Math.round(scoresSum / scoresCount) : null;

        return {
          enrollmentId: enr.id,
          studentId: student.id,
          name: student.name,
          email: student.email,
          status: enr.status,
          enrolledAt: enr.enrolledAt,
          deletedAt: enr.deletedAt,
          totalLessons,
          completedLessons,
          progressPercentage,
          averageScore,
        };
      }),
    );

    return studentReports.filter(Boolean);
  }

  async enrollStudent(courseId: string, emailOrUserId: string) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    const term = emailOrUserId.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);

    let student: User | null = null;
    if (isUuid) {
      student = await this.userRepo.findOne({ where: { id: term } });
    } else {
      student = await this.userRepo.findOne({ where: { email: term.toLowerCase() } });
    }

    if (!student) {
      throw new NotFoundException(`No se encontró ningún estudiante con el email o ID: "${emailOrUserId}"`);
    }

    let enrollment = await this.enrollmentRepo.findOne({
      where: { userId: student.id, courseId },
      withDeleted: true,
    });

    if (enrollment) {
      enrollment.status = EnrollmentStatus.ACTIVE;
      enrollment.deletedAt = null;
      return this.enrollmentRepo.save(enrollment);
    }

    enrollment = this.enrollmentRepo.create({
      userId: student.id,
      courseId,
      status: EnrollmentStatus.ACTIVE,
    });

    return this.enrollmentRepo.save(enrollment);
  }

  async unenrollStudent(courseId: string, studentId: string) {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { userId: studentId, courseId },
    });

    if (!enrollment) {
      throw new NotFoundException('El alumno no se encuentra matriculado en este curso');
    }

    await this.enrollmentRepo.softRemove(enrollment);
    return { success: true, message: 'Alumno desmatriculado con éxito' };
  }

  async getStudentCourseProgress(courseId: string, studentId: string) {
    const student = await this.userRepo.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    const lessons = await this.lessonRepo.find({
      where: { courseId },
      order: { orderNumber: 'ASC' },
    });

    const userProgressList = await this.progressRepo.find({
      where: { userId: studentId },
    });
    const progressMap = new Map<string, UserProgress>();
    userProgressList.forEach((p) => progressMap.set(p.lessonId, p));

    const breakdown = lessons.map((lesson, idx) => {
      const p = progressMap.get(lesson.id);
      let status: ProgressStatus = ProgressStatus.LOCKED;
      if (p) {
        status = p.status;
      } else if (idx === 0) {
        status = ProgressStatus.AVAILABLE;
      }

      return {
        lessonId: lesson.id,
        title: lesson.title,
        orderNumber: lesson.orderNumber,
        status,
        score: p?.score ?? null,
        completedAt: p?.completedAt ?? null,
      };
    });

    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
      },
      course: {
        id: course.id,
        title: course.title,
      },
      lessons: breakdown,
    };
  }

  // ----------------------------------------------------
  // GESTIÓN DE ALUMNOS POR CADA CLASE ESPECÍFICA
  // ----------------------------------------------------
  async getLessonStudents(lessonId: string) {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Clase no encontrada');
    }

    const courseLessons = await this.lessonRepo.find({
      where: { courseId: lesson.courseId },
      order: { orderNumber: 'ASC' },
    });
    const isFirstLesson = courseLessons.length > 0 && courseLessons[0].id === lesson.id;

    // Get all enrolled students in the course
    const enrollments = await this.enrollmentRepo.find({
      where: { courseId: lesson.courseId },
      relations: ['user'],
      order: { enrolledAt: 'DESC' },
    });

    const students = await Promise.all(
      enrollments.map(async (enr) => {
        const student = enr.user;
        if (!student) return null;

        const progress = await this.progressRepo.findOne({
          where: { userId: student.id, lessonId: lesson.id },
        });

        let status: ProgressStatus = ProgressStatus.LOCKED;
        if (progress) {
          status = progress.status;
        } else if (isFirstLesson) {
          status = ProgressStatus.AVAILABLE;
        }

        return {
          studentId: student.id,
          name: student.name,
          email: student.email,
          status,
          score: progress?.score ?? null,
          completedAt: progress?.completedAt ?? null,
        };
      }),
    );

    return {
      lesson: {
        id: lesson.id,
        courseId: lesson.courseId,
        title: lesson.title,
        orderNumber: lesson.orderNumber,
      },
      students: students.filter(Boolean),
    };
  }

  async updateLessonStudentProgress(
    lessonId: string,
    studentId: string,
    status: ProgressStatus,
    score?: number,
  ) {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Clase no encontrada');
    }

    let progress = await this.progressRepo.findOne({
      where: { userId: studentId, lessonId },
    });

    if (!progress) {
      progress = this.progressRepo.create({
        userId: studentId,
        lessonId,
        status,
        score: score !== undefined ? score : (status === ProgressStatus.COMPLETED ? 100 : null),
        completedAt: status === ProgressStatus.COMPLETED ? new Date() : null,
      });
    } else {
      progress.status = status;
      if (score !== undefined) {
        progress.score = score;
      } else if (status === ProgressStatus.COMPLETED && progress.score === null) {
        progress.score = 100;
      }
      if (status === ProgressStatus.COMPLETED && !progress.completedAt) {
        progress.completedAt = new Date();
      }
    }

    await this.progressRepo.save(progress);

    // If marked completed, unlock the next lesson
    if (status === ProgressStatus.COMPLETED) {
      const nextLesson = await this.lessonRepo.findOne({
        where: {
          courseId: lesson.courseId,
          orderNumber: lesson.orderNumber + 1,
        },
      });

      if (nextLesson) {
        let nextProgress = await this.progressRepo.findOne({
          where: { userId: studentId, lessonId: nextLesson.id },
        });

        if (!nextProgress) {
          nextProgress = this.progressRepo.create({
            userId: studentId,
            lessonId: nextLesson.id,
            status: ProgressStatus.AVAILABLE,
          });
          await this.progressRepo.save(nextProgress);
        } else if (nextProgress.status === ProgressStatus.LOCKED) {
          nextProgress.status = ProgressStatus.AVAILABLE;
          await this.progressRepo.save(nextProgress);
        }
      }
    }

    return {
      success: true,
      message: 'Progreso del alumno actualizado correctamente',
      progress,
    };
  }
}
