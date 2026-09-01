import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAiChatAndExtractedText1756745500000 implements MigrationInterface {
    name = 'AddAiChatAndExtractedText1756745500000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Columnas para almacenar texto extraído de PDFs y notas de presentación
        await queryRunner.query(`ALTER TABLE "lesson_documents" ADD COLUMN IF NOT EXISTS "extracted_text" text`);
        await queryRunner.query(`ALTER TABLE "technical_sheets" ADD COLUMN IF NOT EXISTS "extracted_text" text`);
        await queryRunner.query(`ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "presentation_notes" text`);

        // 2. Columnas de progreso de cuestionarios / quizzes
        await queryRunner.query(`ALTER TABLE "user_progress" ADD COLUMN IF NOT EXISTS "quizAnswers" jsonb`);
        await queryRunner.query(`ALTER TABLE "user_progress" ADD COLUMN IF NOT EXISTS "attempts_count" integer DEFAULT 0`);

        // 3. Tabla de mensajes de chat con IA y control de cuota por alumno
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "course_id" uuid NOT NULL,
                "role" character varying(50) NOT NULL DEFAULT 'user',
                "message" text NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_chat_messages_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_ai_chat_messages_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_ai_chat_messages_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE
            )
        `);

        // 4. Índice para optimizar consultas de historial y conteo de cuota diaria
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_ai_chat_user_course_created" 
            ON "ai_chat_messages" ("user_id", "course_id", "created_at")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_chat_user_course_created"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_chat_messages"`);
        await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN IF EXISTS "presentation_notes"`);
        await queryRunner.query(`ALTER TABLE "technical_sheets" DROP COLUMN IF EXISTS "extracted_text"`);
        await queryRunner.query(`ALTER TABLE "lesson_documents" DROP COLUMN IF EXISTS "extracted_text"`);
        await queryRunner.query(`ALTER TABLE "user_progress" DROP COLUMN IF EXISTS "attempts_count"`);
        await queryRunner.query(`ALTER TABLE "user_progress" DROP COLUMN IF EXISTS "quizAnswers"`);
    }
}
