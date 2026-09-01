import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAiChatConversations1756745600000 implements MigrationInterface {
    name = 'AddAiChatConversations1756745600000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Crear tabla de conversaciones
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_chat_conversations" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "course_id" uuid NOT NULL,
                "title" character varying(150) NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_chat_conversations_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_ai_chat_conversations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_ai_chat_conversations_course" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE
            )
        `);

        // 2. Agregar columna conversation_id a ai_chat_messages
        await queryRunner.query(`ALTER TABLE "ai_chat_messages" ADD COLUMN IF NOT EXISTS "conversation_id" uuid`);

        // 3. Crear constraint de foreign key si no existe
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'FK_ai_chat_messages_conversation'
                ) THEN
                    ALTER TABLE "ai_chat_messages"
                    ADD CONSTRAINT "FK_ai_chat_messages_conversation"
                    FOREIGN KEY ("conversation_id") REFERENCES "ai_chat_conversations"("id") ON DELETE CASCADE;
                END IF;
            END $$;
        `);

        // 4. Índices para optimizar búsquedas y ordenamiento
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_ai_chat_conversations_user_course"
            ON "ai_chat_conversations" ("user_id", "course_id", "updated_at")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_ai_chat_messages_conversation"
            ON "ai_chat_messages" ("conversation_id", "created_at")
        `);

        // 5. Migrar mensajes previos huérfanos a una conversación agrupada
        await queryRunner.query(`
            DO $$
            DECLARE
                r RECORD;
                new_conv_id uuid;
            BEGIN
                FOR r IN SELECT DISTINCT user_id, course_id FROM ai_chat_messages WHERE conversation_id IS NULL LOOP
                    INSERT INTO ai_chat_conversations (id, user_id, course_id, title, created_at, updated_at)
                    VALUES (gen_random_uuid(), r.user_id, r.course_id, 'Conversación anterior', now(), now())
                    RETURNING id INTO new_conv_id;

                    UPDATE ai_chat_messages 
                    SET conversation_id = new_conv_id 
                    WHERE user_id = r.user_id AND course_id = r.course_id AND conversation_id IS NULL;
                END LOOP;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_chat_messages_conversation"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_ai_chat_conversations_user_course"`);
        await queryRunner.query(`ALTER TABLE "ai_chat_messages" DROP CONSTRAINT IF EXISTS "FK_ai_chat_messages_conversation"`);
        await queryRunner.query(`ALTER TABLE "ai_chat_messages" DROP COLUMN IF EXISTS "conversation_id"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_chat_conversations"`);
    }
}
