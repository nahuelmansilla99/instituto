import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConfig } from './database/typeorm.config';
import { DatabaseSeedService } from './database/database-seed.service';
import { User, Course, Lesson, QuizQuestion, UserProgress, CourseEnrollment, TechnicalSheet } from './entities';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { LessonsModule } from './lessons/lessons.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { AdminModule } from './admin/admin.module';
import { UsersModule } from './users/users.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    TypeOrmModule.forRootAsync({ useFactory: () => getTypeOrmConfig() }),
    TypeOrmModule.forFeature([User, Course, Lesson, QuizQuestion, UserProgress, CourseEnrollment, TechnicalSheet]),
    AuthModule,
    CoursesModule,
    LessonsModule,
    QuizzesModule,
    AdminModule,
    UsersModule,
    CloudinaryModule,
  ],
  providers: [DatabaseSeedService],
})
export class AppModule {}
