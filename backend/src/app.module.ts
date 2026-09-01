import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
    ThrottlerModule.forRoot({
      errorMessage: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.',
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
    AuthModule,
    CoursesModule,
    LessonsModule,
    QuizzesModule,
    AdminModule,
    UsersModule,
    CloudinaryModule,
  ],
  providers: [
    DatabaseSeedService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
