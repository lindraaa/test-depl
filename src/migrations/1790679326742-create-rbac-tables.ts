import { MigrationInterface, QueryRunner } from 'typeorm';

const ADMIN_PERMISSION_KEYS = [
  'users:read',
  'users:create',
  'users:update',
  'users:delete',
  'roles:read',
  'roles:create',
  'roles:update',
  'roles:delete',
  'roles:assign-permissions',
  'roles:assign-users',
];

const USER_PERMISSION_KEYS = ['users:read'];

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'users:read': 'View users and their assigned roles',
  'users:create': 'Create users',
  'users:update': 'Update users',
  'users:delete': 'Delete users',
  'roles:read': 'View roles, role permissions and the permission catalog',
  'roles:create': 'Create roles',
  'roles:update': 'Update roles',
  'roles:delete': 'Delete roles',
  'roles:assign-permissions': 'Replace the permission set of a role',
  'roles:assign-users': 'Assign one role to a user',
};

export class CreateRbacTables1790679326742 implements MigrationInterface {
  name = 'CreateRbacTables1790679326742';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "isSystemRole" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_roles_name" UNIQUE ("name"), CONSTRAINT "PK_roles" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "description" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_permissions_key" UNIQUE ("key"), CONSTRAINT "PK_permissions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("roleId" uuid NOT NULL, "permissionId" uuid NOT NULL, CONSTRAINT "PK_role_permissions" PRIMARY KEY ("roleId", "permissionId"), CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE, CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_role_permissions_permission_id" ON "role_permissions" ("permissionId")`,
    );

    const permissionValues = Object.entries(PERMISSION_DESCRIPTIONS)
      .map(
        ([key, description]) =>
          `('${key}', '${description.replace(/'/g, "''")}')`,
      )
      .join(', ');

    await queryRunner.query(
      `INSERT INTO "permissions" ("key", "description") VALUES ${permissionValues} ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description"`,
    );

    await queryRunner.query(
      `INSERT INTO "roles" ("name", "description", "isSystemRole") VALUES ('admin', 'Full administrative access', true), ('user', 'Standard user with limited access', true) ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description", "isSystemRole" = EXCLUDED."isSystemRole"`,
    );

    for (const [roleName, permissionKeys] of [
      ['admin', ADMIN_PERMISSION_KEYS],
      ['user', USER_PERMISSION_KEYS],
    ] as const) {
      await queryRunner.query(
        `INSERT INTO "role_permissions" ("roleId", "permissionId") SELECT "roles"."id", "permissions"."id" FROM "roles" INNER JOIN "permissions" ON "permissions"."key" IN (${permissionKeys
          .map((key) => `'${key}'`)
          .join(
            ', ',
          )}) WHERE "roles"."name" = '${roleName}' ON CONFLICT DO NOTHING`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_role_permissions_permission_id"`,
    );
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
