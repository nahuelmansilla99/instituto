import { DataSource } from 'typeorm';
import { User, Course, Lesson, QuizQuestion, UserProgress } from '../entities';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Course, Lesson, QuizQuestion, UserProgress],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
});

async function runSeed() {
  console.log('🚀 Conectando a la base de datos...');
  
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    throw new Error('Faltan variables de entorno de base de datos obligatorias: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
  }

  await AppDataSource.initialize();
  console.log('✅ Conexión establecida con éxito. El sembrado de datos hardcodeados ha sido eliminado por completo.');
  await AppDataSource.destroy();
}

runSeed().catch((err) => {
  console.error('❌ Error durante la conexión a la base de datos:', err);
  process.exit(1);
});
