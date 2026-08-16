import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { Course, Lesson, UserProgress, CourseEnrollment } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Lesson, UserProgress, CourseEnrollment])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
