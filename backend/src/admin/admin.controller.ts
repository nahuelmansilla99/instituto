import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateQuestionDto } from './dto/create-question.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ----------------------------------------------------
  // CURSOS
  // ----------------------------------------------------
  @Post('courses')
  createCourse(@Body() dto: CreateCourseDto) {
    return this.adminService.createCourse(dto);
  }

  @Get('courses/:id')
  getCourseAdmin(@Param('id') id: string) {
    return this.adminService.getCourseAdmin(id);
  }

  @Put('courses/:id')
  updateCourse(@Param('id') id: string, @Body() dto: Partial<CreateCourseDto>) {
    return this.adminService.updateCourse(id, dto);
  }

  @Delete('courses/:id')
  deleteCourse(@Param('id') id: string) {
    return this.adminService.deleteCourse(id);
  }

  // ----------------------------------------------------
  // CLASES (LECCIONES)
  // ----------------------------------------------------
  @Post('courses/:courseId/lessons')
  createLesson(
    @Param('courseId') courseId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.adminService.createLesson(courseId, dto);
  }

  @Put('lessons/:id')
  updateLesson(
    @Param('id') id: string,
    @Body() dto: Partial<CreateLessonDto>,
  ) {
    return this.adminService.updateLesson(id, dto);
  }

  @Patch('lessons/:id/toggle-publish')
  toggleLessonPublish(@Param('id') id: string) {
    return this.adminService.toggleLessonPublish(id);
  }

  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: string) {
    return this.adminService.deleteLesson(id);
  }

  // ----------------------------------------------------
  // PRESENTACIONES POWERPOINT (.pptx, .ppt, .pdf)
  // ----------------------------------------------------
  @Post('lessons/:lessonId/presentation')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowed = ['.ppt', '.pptx', '.pdf', '.odp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(
            new BadRequestException(
              'Formato no permitido. Solo se admiten archivos de PowerPoint (.pptx, .ppt) o documentos PDF (.pdf)',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    }),
  )
  uploadPresentation(
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes seleccionar un archivo de presentación');
    }
    return this.adminService.setLessonPresentation(lessonId, file);
  }

  @Delete('lessons/:lessonId/presentation')
  deletePresentation(@Param('lessonId') lessonId: string) {
    return this.adminService.deleteLessonPresentation(lessonId);
  }

  // ----------------------------------------------------
  // FICHAS TÉCNICAS (PDFs COMPLEMENTARIOS)
  // ----------------------------------------------------
  @Post('lessons/:lessonId/technical-sheets')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.pdf') {
          return cb(
            new BadRequestException(
              'Formato no permitido. Solo se admiten archivos PDF (.pdf)',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  uploadTechnicalSheet(
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes seleccionar un archivo PDF');
    }
    return this.adminService.uploadTechnicalSheet(lessonId, file);
  }

  @Delete('technical-sheets/:id')
  deleteTechnicalSheet(@Param('id') id: string) {
    return this.adminService.deleteTechnicalSheet(id);
  }

  // ----------------------------------------------------
  // DOCUMENTACIÓN DE LA CLASE (PDFs IMPORTANTES)
  // ----------------------------------------------------
  @Post('lessons/:lessonId/lesson-documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.pdf') {
          return cb(
            new BadRequestException(
              'Formato no permitido. Solo se admiten archivos PDF (.pdf)',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  uploadLessonDocument(
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes seleccionar un archivo PDF');
    }
    return this.adminService.uploadLessonDocument(lessonId, file);
  }

  @Delete('lesson-documents/:id')
  deleteLessonDocument(@Param('id') id: string) {
    return this.adminService.deleteLessonDocument(id);
  }

  // ----------------------------------------------------
  // PREGUNTAS DEL CUESTIONARIO (MULTIPLE CHOICE)
  // ----------------------------------------------------
  @Get('lessons/:lessonId/questions')
  getQuestions(@Param('lessonId') lessonId: string) {
    return this.adminService.getQuestions(lessonId);
  }

  @Post('lessons/:lessonId/questions')
  createQuestion(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.adminService.createQuestion(lessonId, dto);
  }

  @Put('questions/:id')
  updateQuestion(
    @Param('id') id: string,
    @Body() dto: Partial<CreateQuestionDto>,
  ) {
    return this.adminService.updateQuestion(id, dto);
  }

  @Delete('questions/:id')
  deleteQuestion(@Param('id') id: string) {
    return this.adminService.deleteQuestion(id);
  }



  // ----------------------------------------------------
  // GESTIÓN DE ALUMNOS POR CURSO
  // ----------------------------------------------------
  @Get('students')
  getAllStudents() {
    return this.adminService.getAllStudents();
  }

  @Get('courses/:courseId/students')
  getCourseStudents(@Param('courseId') courseId: string) {
    return this.adminService.getCourseStudents(courseId);
  }

  @Post('courses/:courseId/students')
  enrollStudent(
    @Param('courseId') courseId: string,
    @Body() body: { emailOrUserId: string },
  ) {
    if (!body.emailOrUserId) {
      throw new BadRequestException('Debes ingresar el correo electrónico o ID del alumno');
    }
    return this.adminService.enrollStudent(courseId, body.emailOrUserId);
  }

  @Delete('courses/:courseId/students/:studentId')
  unenrollStudent(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.adminService.unenrollStudent(courseId, studentId);
  }

  @Get('courses/:courseId/students/:studentId/progress')
  getStudentCourseProgress(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.adminService.getStudentCourseProgress(courseId, studentId);
  }

  // ----------------------------------------------------
  // GESTIÓN DE ALUMNOS POR CLASE ESPECÍFICA
  // ----------------------------------------------------
  @Get('lessons/:lessonId/students')
  getLessonStudents(@Param('lessonId') lessonId: string) {
    return this.adminService.getLessonStudents(lessonId);
  }

  @Put('lessons/:lessonId/students/:studentId')
  updateLessonStudentProgress(
    @Param('lessonId') lessonId: string,
    @Param('studentId') studentId: string,
    @Body() body: { status: any; score?: number },
  ) {
    return this.adminService.updateLessonStudentProgress(
      lessonId,
      studentId,
      body.status,
      body.score,
    );
  }
}
