import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuizCaseTextToLessons1727620000000 implements MigrationInterface {
    name = 'AddQuizCaseTextToLessons1727620000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "quiz_case_text" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN IF EXISTS "quiz_case_text"`);
    }
}
