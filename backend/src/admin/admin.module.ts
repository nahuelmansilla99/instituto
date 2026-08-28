import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Course, Lesson, QuizQuestion, User, UserProgress, CourseEnrollment, TechnicalSheet, LessonDocument } from '../entities';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      Lesson,
      QuizQuestion,
      User,
      UserProgress,
      CourseEnrollment,
      TechnicalSheet,
      LessonDocument,
    ]),
    CloudinaryModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
