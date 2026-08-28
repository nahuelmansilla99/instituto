import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User, Course, Lesson, QuizQuestion, UserProgress, CourseEnrollment, TechnicalSheet, LessonDocument } from '../entities';

export const getTypeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
  port: process.env.DATABASE_URL ? undefined : (process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined),
  username: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
  entities: [User, Course, Lesson, QuizQuestion, UserProgress, CourseEnrollment, TechnicalSheet, LessonDocument],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsRun: process.env.RUN_MIGRATIONS === 'true', // Run migrations safely in production if true
  synchronize: process.env.DB_SYNCHRONIZE === 'true', // Sync only when explicitly enabled
  logging: process.env.NODE_ENV === 'development',
});
