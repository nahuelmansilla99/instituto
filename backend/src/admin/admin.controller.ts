import {
  Controller,
  Get,
  Post,
  Put,
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

  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: string) {
    return this.adminService.deleteLesson(id);
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
  // PLANTILLA Y SUBIDA MASIVA POR EXCEL (.xlsx / .csv)
  // ----------------------------------------------------
  @Get('template-excel')
  downloadTemplate(@Res() res: Response) {
    const buffer = this.adminService.generateExcelTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=plantilla_clases_y_preguntas.xlsx',
    );
    res.send(buffer);
  }

  @Post('courses/:courseId/upload-excel')
  @UseInterceptors(FileInterceptor('file'))
  uploadExcel(
    @Param('courseId') courseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo Excel (.xlsx o .csv)');
    }
    return this.adminService.processExcelUpload(courseId, file.buffer);
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
