import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCloudinaryToUsers1724816828000 implements MigrationInterface {
    name = 'AddCloudinaryToUsers1724816828000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_public_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_public_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`);
    }
}
