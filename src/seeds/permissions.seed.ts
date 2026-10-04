import 'reflect-metadata';
import dataSource from '../data-source';
import {
  ADMIN_PERMISSION_KEYS,
  PERMISSION_DEFINITIONS,
  SYSTEM_ROLE_ADMIN,
  SYSTEM_ROLE_USER,
  USER_PERMISSION_KEYS,
} from '../common/constants/permissions';

const SCHEMA = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
  `CREATE TABLE IF NOT EXISTS "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "isSystemRole" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_roles_name" UNIQUE ("name"), CONSTRAINT "PK_roles" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "description" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_permissions_key" UNIQUE ("key"), CONSTRAINT "PK_permissions" PRIMARY KEY ("id"))`,
  `CREATE TABLE IF NOT EXISTS "role_permissions" ("roleId" uuid NOT NULL, "permissionId" uuid NOT NULL, CONSTRAINT "PK_role_permissions" PRIMARY KEY ("roleId", "permissionId"), CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE, CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE)`,
  `CREATE INDEX IF NOT EXISTS "IDX_role_permissions_permission_id" ON "role_permissions" ("permissionId")`,
];

const SYSTEM_ROLE_SEED = [
  { name: SYSTEM_ROLE_ADMIN, description: 'Full administrative access' },
  { name: SYSTEM_ROLE_USER, description: 'Standard user with limited access' },
] as const;

const GRANTS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [SYSTEM_ROLE_ADMIN, ADMIN_PERMISSION_KEYS],
  [SYSTEM_ROLE_USER, USER_PERMISSION_KEYS],
];

function marks(count: number, offset = 0): string {
  return Array.from({ length: count }, (_, i) => `$${i + 1 + offset}`).join(
    ', ',
  );
}

async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    await dataSource.transaction(async (db) => {
      for (const ddl of SCHEMA) {
        await db.query(ddl);
      }

      await db.query(
        `INSERT INTO "permissions" ("key", "description") VALUES ${PERMISSION_DEFINITIONS.map(
          (_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`,
        ).join(
          ', ',
        )} ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description"`,
        PERMISSION_DEFINITIONS.flatMap(({ key, description }) => [
          key,
          description,
        ]),
      );

      await db.query(
        `INSERT INTO "roles" ("name", "description", "isSystemRole") VALUES ${SYSTEM_ROLE_SEED.map(
          (_, i) => `($${i * 2 + 1}, $${i * 2 + 2}, true)`,
        ).join(
          ', ',
        )} ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description", "isSystemRole" = EXCLUDED."isSystemRole"`,
        SYSTEM_ROLE_SEED.flatMap(({ name, description }) => [
          name,
          description,
        ]),
      );

      for (const [roleName, keys] of GRANTS) {
        await db.query(
          `INSERT INTO "role_permissions" ("roleId", "permissionId") SELECT "roles"."id", "permissions"."id" FROM "roles" INNER JOIN "permissions" ON "permissions"."key" IN (${marks(keys.length)}) WHERE "roles"."name" = $${keys.length + 1} ON CONFLICT DO NOTHING`,
          [...keys, roleName],
        );
      }
    });

    console.log(
      `Seeded ${PERMISSION_DEFINITIONS.length} permissions (admin ${ADMIN_PERMISSION_KEYS.length}, user ${USER_PERMISSION_KEYS.length}).`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error('Permission seed failed:', error);
  process.exit(1);
});
