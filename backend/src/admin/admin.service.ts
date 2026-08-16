import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { Course, Lesson, QuizQuestion, User, UserRole, UserProgress, CourseEnrollment, EnrollmentStatus, ProgressStatus } from '../entities';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateQuestionDto } from './dto/create-question.dto';

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
      relations: ['lessons', 'lessons.quizQuestions'],
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
    await this.courseRepo.remove(course);
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

    return this.lessonRepo.save(lesson);
  }

  async setLessonPresentation(lessonId: string, file: Express.Multer.File): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Clase no encontrada');
    }

    if (lesson.presentationUrl && lesson.presentationUrl.startsWith('/api/uploads/presentations/')) {
      const oldFilename = lesson.presentationUrl.replace('/api/uploads/presentations/', '');
      const oldPath = path.join(process.cwd(), 'uploads', 'presentations', oldFilename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (_) {}
      }
    }

    lesson.presentationUrl = `/api/uploads/presentations/${file.filename}`;
    lesson.presentationFilename = file.originalname;

    return this.lessonRepo.save(lesson);
  }

  async deleteLessonPresentation(lessonId: string): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Clase no encontrada');
    }

    if (lesson.presentationUrl && lesson.presentationUrl.startsWith('/api/uploads/presentations/')) {
      const oldFilename = lesson.presentationUrl.replace('/api/uploads/presentations/', '');
      const oldPath = path.join(process.cwd(), 'uploads', 'presentations', oldFilename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (_) {}
      }
    }

    lesson.presentationUrl = null;
    lesson.presentationFilename = null;

    return this.lessonRepo.save(lesson);
  }

  async deleteLesson(id: string): Promise<{ success: boolean }> {
    const lesson = await this.lessonRepo.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException('Lección no encontrada');
    }

    if (lesson.presentationUrl && lesson.presentationUrl.startsWith('/api/uploads/presentations/')) {
      const oldFilename = lesson.presentationUrl.replace('/api/uploads/presentations/', '');
      const oldPath = path.join(process.cwd(), 'uploads', 'presentations', oldFilename);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (_) {}
      }
    }

    await this.lessonRepo.remove(lesson);
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
  // GENERADOR Y PARSER DE EXCEL (.xlsx / .csv)
  // ----------------------------------------------------
  generateExcelTemplate(): Buffer {
    const headers = [
      {
        'Titulo_Clase': '1. Introducción al Framework',
        'Contenido_HTML_o_Video': '<h2>Bienvenido</h2><p>Contenido explicativo de la clase...</p>',
        'Orden': 1,
        'Enlace_Meet': 'https://meet.google.com/abc-defg-hij',
        'Pregunta': '¿Cuál es la ventaja principal de la arquitectura modular?',
        'Opcion_A': 'Mejor separación de responsabilidades y mantenibilidad',
        'Opcion_B': 'Elimina la necesidad de bases de datos',
        'Opcion_C': 'Hace que el código se ejecute en el navegador',
        'Opcion_D': 'Ninguna de las anteriores',
        'Opcion_Correcta': 'A', // Puede ser 'A', 'B', 'C', 'D' o 0, 1, 2, 3
      },
      {
        'Titulo_Clase': '1. Introducción al Framework',
        'Contenido_HTML_o_Video': '<h2>Bienvenido</h2><p>Contenido explicativo de la clase...</p>',
        'Orden': 1,
        'Enlace_Meet': 'https://meet.google.com/abc-defg-hij',
        'Pregunta': '¿Qué protocolo se utiliza para la comunicación en APIs REST?',
        'Opcion_A': 'FTP',
        'Opcion_B': 'HTTP / HTTPS',
        'Opcion_C': 'SMTP',
        'Opcion_D': 'SSH',
        'Opcion_Correcta': 'B',
      },
      {
        'Titulo_Clase': '2. Controladores y Rutas',
        'Contenido_HTML_o_Video': '<p>En esta clase aprenderemos sobre peticiones GET, POST, PUT, DELETE.</p>',
        'Orden': 2,
        'Enlace_Meet': 'https://meet.google.com/xyz-uvwx-rst',
        'Pregunta': '¿Qué método HTTP se utiliza para crear un nuevo recurso?',
        'Opcion_A': 'GET',
        'Opcion_B': 'DELETE',
        'Opcion_C': 'POST',
        'Opcion_D': 'PATCH',
        'Opcion_Correcta': 'C',
      },
    ];

    const worksheet = xlsx.utils.json_to_sheet(headers);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Clases y Preguntas');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async processExcelUpload(courseId: string, buffer: Buffer) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('El archivo Excel no contiene hojas de datos válidas');
    }

    const rows: any[] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows || rows.length === 0) {
      throw new BadRequestException('El archivo Excel está vacío');
    }

    let lessonsCreated = 0;
    let questionsCreated = 0;

    // Cache to group rows by class title
    const lessonsMap = new Map<string, Lesson>();

    // Determine current highest orderNumber
    const existingLessons = await this.lessonRepo.find({
      where: { courseId },
      order: { orderNumber: 'DESC' },
      take: 1,
    });
    let currentOrder = existingLessons.length > 0 ? existingLessons[0].orderNumber + 1 : 1;

    for (const row of rows) {
      const lessonTitle = row['Titulo_Clase'] || row['titulo_clase'] || row['Clase'] || row['clase'];
      if (!lessonTitle) continue;

      const titleKey = String(lessonTitle).trim();
      let lesson = lessonsMap.get(titleKey);

      if (!lesson) {
        // Check if lesson exists in DB
        lesson = await this.lessonRepo.findOne({
          where: { courseId, title: titleKey },
        });

        if (!lesson) {
          const content = row['Contenido_HTML_o_Video'] || row['contenido'] || `<p>Clase: ${titleKey}</p>`;
          const orderNum = parseInt(row['Orden'] || row['orden'], 10) || currentOrder++;
          const meetUrl = row['Enlace_Meet'] || row['meet_url'] || null;

          lesson = this.lessonRepo.create({
            courseId,
            title: titleKey,
            content: String(content),
            orderNumber: orderNum,
            meetUrl: meetUrl ? String(meetUrl).trim() : null,
          });
          lesson = await this.lessonRepo.save(lesson);
          lessonsCreated++;
        }

        lessonsMap.set(titleKey, lesson);
      }

      // Check if row contains a question
      const questionText = row['Pregunta'] || row['pregunta'];
      if (questionText && String(questionText).trim().length > 0) {
        const optA = row['Opcion_A'] || row['opcion_a'] || row['A'];
        const optB = row['Opcion_B'] || row['opcion_b'] || row['B'];
        const optC = row['Opcion_C'] || row['opcion_c'] || row['C'];
        const optD = row['Opcion_D'] || row['opcion_d'] || row['D'];

        const options: string[] = [optA, optB, optC, optD]
          .filter((opt) => opt !== undefined && opt !== null && String(opt).trim().length > 0)
          .map((opt) => String(opt).trim());

        if (options.length >= 2) {
          const rawCorrect = row['Opcion_Correcta'] || row['opcion_correcta'] || row['Correcta'] || 'A';
          let correctIndex = 0;

          if (typeof rawCorrect === 'number') {
            correctIndex = rawCorrect;
          } else if (typeof rawCorrect === 'string') {
            const letter = rawCorrect.trim().toUpperCase();
            if (letter === 'A' || letter === '0') correctIndex = 0;
            else if (letter === 'B' || letter === '1') correctIndex = 1;
            else if (letter === 'C' || letter === '2') correctIndex = 2;
            else if (letter === 'D' || letter === '3') correctIndex = 3;
            else {
              const parsed = parseInt(letter, 10);
              if (!isNaN(parsed) && parsed >= 0 && parsed < options.length) {
                correctIndex = parsed;
              }
            }
          }

          if (correctIndex >= options.length) {
            correctIndex = 0;
          }

          const qEntity = this.quizRepo.create({
            lessonId: lesson.id,
            questionText: String(questionText).trim(),
            options,
            correctOptionIndex: correctIndex,
          });

          await this.quizRepo.save(qEntity);
          questionsCreated++;
        }
      }
    }

      return {
      success: true,
      message: `Procesamiento completado con éxito.`,
      lessonsCreated,
      questionsCreated,
    };
  }

  // ----------------------------------------------------
  // GESTIÓN DE ALUMNOS POR CURSO (MATRÍCULAS Y NOTAS)
  // ----------------------------------------------------
  async getAllStudents() {
    const students = await this.userRepo.find({
      where: { role: UserRole.STUDENT },
      order: { name: 'ASC' },
      select: ['id', 'name', 'email', 'createdAt'],
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
    });

    if (enrollment) {
      enrollment.status = EnrollmentStatus.ACTIVE;
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

    await this.enrollmentRepo.remove(enrollment);
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
