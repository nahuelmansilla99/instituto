import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { Lesson } from '../entities/lesson.entity';
import { Course } from '../entities/course.entity';
import { QuizQuestion } from '../entities/quiz-question.entity';
import { UserProgress } from '../entities/user-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, Course, QuizQuestion, UserProgress])],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
