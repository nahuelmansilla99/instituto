import { MigrationInterface, QueryRunner } from "typeorm";

export class AddYoutubeUrlToLessons1724820000000 implements MigrationInterface {
    name = 'AddYoutubeUrlToLessons1724820000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "youtube_url" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" DROP COLUMN IF EXISTS "youtube_url"`);
    }
}
