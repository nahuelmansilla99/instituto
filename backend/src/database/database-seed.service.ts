import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeedService.name);

  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    try {
      this.logger.log('Verificando inicialización y esquema de base de datos...');
      
      // Garantizar que las columnas necesarias existan en las tablas
      await this.dataSource.query(`ALTER TABLE courses ADD COLUMN IF NOT EXISTS meet_url VARCHAR(500);`);
      await this.dataSource.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS meet_url VARCHAR(500);`);
      await this.dataSource.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS presentation_url VARCHAR(500);`);
      await this.dataSource.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS presentation_filename VARCHAR(255);`);
      await this.dataSource.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS available_at TIMESTAMP WITH TIME ZONE;`);

      // Crear tabla de matriculaciones si no existe
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS course_enrollments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
        );
      `);

      this.logger.log('✅ Estructura de base de datos verificada. No se sembraron datos predeterminados.');
    } catch (error) {
      this.logger.warn(`Advertencia al sincronizar base de datos: ${error.message}`);
    }
  }
}
