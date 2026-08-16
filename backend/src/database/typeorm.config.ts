import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User, Course, Lesson, QuizQuestion, UserProgress, CourseEnrollment } from '../entities';

export const getTypeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'elearning_db',
  entities: [User, Course, Lesson, QuizQuestion, UserProgress, CourseEnrollment],
  synchronize: process.env.NODE_ENV !== 'production', // Synchronizes schema in development
  logging: process.env.NODE_ENV === 'development',
});
