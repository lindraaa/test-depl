import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_ROLE = 'user';

export class MigrateUsersToRoleRelation1790679326743 implements MigrationInterface {
  name = 'MigrateUsersToRoleRelation1790679326743';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "roleId" uuid`);

    await queryRunner.query(
      `UPDATE "users" SET "roleId" = "roles"."id" FROM "roles" WHERE "users"."role" = "roles"."name"`,
    );

    await queryRunner.query(
      `UPDATE "users" SET "roleId" = "roles"."id" FROM "roles" WHERE "users"."roleId" IS NULL AND "roles"."name" = '${DEFAULT_ROLE}'`,
    );

    await queryRunner.query(
      `DO $$ BEGIN IF EXISTS (SELECT 1 FROM "users" WHERE "roleId" IS NULL) THEN RAISE EXCEPTION 'Cannot migrate users.role: % row(s) could not be assigned a role. Create a role named "${DEFAULT_ROLE}" and retry.', (SELECT count(*) FROM "users" WHERE "roleId" IS NULL); END IF; END $$`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_role_id" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_users_role_id" ON "users" ("roleId")`,
    );

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "role" character varying NOT NULL DEFAULT '${DEFAULT_ROLE}'`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "role" = "roles"."name" FROM "roles" WHERE "users"."roleId" = "roles"."id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_users_role_id"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_role_id"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roleId"`);
  }
}
