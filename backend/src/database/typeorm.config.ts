import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User, Course, Lesson, QuizQuestion, UserProgress, CourseEnrollment } from '../entities';

export const getTypeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
  port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
  password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || 'postgres'),
  database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'elearning_db'),
  entities: [User, Course, Lesson, QuizQuestion, UserProgress, CourseEnrollment],
  synchronize: process.env.DB_SYNCHRONIZE === 'true', // Sync only when explicitly enabled
  logging: process.env.NODE_ENV === 'development',
});
