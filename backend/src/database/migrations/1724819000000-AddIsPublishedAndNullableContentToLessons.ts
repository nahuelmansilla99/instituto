import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsPublishedAndNullableContentToLessons1724819000000 implements MigrationInterface {
    name = 'AddIsPublishedAndNullableContentToLessons1724819000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "is_published" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "lessons" ALTER COLUMN "content" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" ALTER COLUMN "content" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN IF EXISTS "is_published"`);
    }
}
