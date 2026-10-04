import { MigrationInterface, QueryRunner } from 'typeorm';

const ADMIN_ROLE = 'admin';
const DEFAULT_ROLE = 'user';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function initialAdministratorSupabaseUserId(): string | null {
  const value = process.env.ADMIN_SUPABASE_USER_ID?.trim();

  if (!value || !UUID_PATTERN.test(value)) {
    return null;
  }

  return value;
}

/**
 * First administrator provisioning. Public registration never chooses a role,
 * so the first administrative account is promoted by a deployment-time seed
 * that reads the Supabase user id from configuration.
 *
 * Set `ADMIN_SUPABASE_USER_ID` in `backend/.env` before running the migration
 * to promote an existing user. Without it the migration is a no-op and the
 * promotion can be repeated later by running the migration again.
 */
export class PromoteInitialAdministrator1790679326744 implements MigrationInterface {
  name = 'PromoteInitialAdministrator1790679326744';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const supabaseUserId = initialAdministratorSupabaseUserId();

    if (!supabaseUserId) {
      return;
    }

    await queryRunner.query(
      `UPDATE "users" SET "roleId" = (SELECT "id" FROM "roles" WHERE "name" = $1) WHERE "supabaseUserId" = $2`,
      [ADMIN_ROLE, supabaseUserId],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const supabaseUserId = initialAdministratorSupabaseUserId();

    if (!supabaseUserId) {
      return;
    }

    await queryRunner.query(
      `UPDATE "users" SET "roleId" = (SELECT "id" FROM "roles" WHERE "name" = $1) WHERE "supabaseUserId" = $2`,
      [DEFAULT_ROLE, supabaseUserId],
    );
  }
}
