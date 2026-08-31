import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCloudinaryToCoursesAndLessons1724818000000 implements MigrationInterface {
    name = 'AddCloudinaryToCoursesAndLessons1724818000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "thumbnail_public_id" character varying`);
        await queryRunner.query(`ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "presentation_public_id" character varying`);
        await queryRunner.query(`ALTER TABLE "lesson_documents" ADD COLUMN IF NOT EXISTS "file_public_id" character varying`);
        await queryRunner.query(`ALTER TABLE "technical_sheets" ADD COLUMN IF NOT EXISTS "file_public_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "technical_sheets" DROP COLUMN "file_public_id"`);
        await queryRunner.query(`ALTER TABLE "lesson_documents" DROP COLUMN "file_public_id"`);
        await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN "presentation_public_id"`);
        await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "thumbnail_public_id"`);
    }
}
