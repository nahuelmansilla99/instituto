import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { QuizQuestion } from '../entities/quiz-question.entity';
import { Lesson } from '../entities/lesson.entity';
import { UserProgress } from '../entities/user-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuizQuestion, Lesson, UserProgress])],
  controllers: [QuizzesController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
