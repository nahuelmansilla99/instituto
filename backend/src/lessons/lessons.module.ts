import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { Lesson, Course, QuizQuestion, UserProgress, CourseEnrollment } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lesson,
      Course,
      QuizQuestion,
      UserProgress,
      CourseEnrollment,
    ]),
  ],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
