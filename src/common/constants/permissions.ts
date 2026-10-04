/**
 * Permission keys are an application contract: they are stable strings that
 * feature controllers reference through `@RequirePermission()`. Role names are
 * configurable database data and must never be used for authorization.
 *
 * Adding a new module:
 * 1. declare its permission keys here (or in its own module constants file),
 * 2. add one entry per key to PERMISSION_DEFINITIONS,
 * 3. reference the keys from the protected endpoints,
 * 4. run `npm run seed:permissions`.
 */
export const USERS_PERMISSIONS = {
  READ: 'users:read',
  CREATE: 'users:create',
  UPDATE: 'users:update',
  DELETE: 'users:delete',
} as const;

export const ROLES_PERMISSIONS = {
  READ: 'roles:read',
  CREATE: 'roles:create',
  UPDATE: 'roles:update',
  DELETE: 'roles:delete',
  ASSIGN_PERMISSIONS: 'roles:assign-permissions',
  ASSIGN_USERS: 'roles:assign-users',
} as const;


export const SYSTEM_ROLE_ADMIN = 'admin';
export const SYSTEM_ROLE_USER = 'user';

/**
 * Roles created by the permission seed. They are marked as system roles, which
 * protects them from casual deletion or renaming.
 */
export const SYSTEM_ROLES = [SYSTEM_ROLE_ADMIN, SYSTEM_ROLE_USER] as const;

/**
 * Role assigned to self-registered and Google-provisioned profiles. Public
 * registration must never be able to choose its own role.
 */
export const DEFAULT_USER_ROLE = SYSTEM_ROLE_USER;

/**
 * The permission that marks a role as administrative. The last role holding it
 * cannot be deleted or stripped of it.
 */
export const ADMINISTRATIVE_PERMISSION = ROLES_PERMISSIONS.ASSIGN_PERMISSIONS;

/**
 * The catalog the seed writes to the `permissions` table. Every key referenced
 * by a controller must appear here, otherwise that route answers 403 for
 * everyone, admin included.
 */
export const PERMISSION_DEFINITIONS = [
  {
    key: USERS_PERMISSIONS.READ,
    description: 'View users and their assigned roles',
  },
  {
    key: USERS_PERMISSIONS.CREATE,
    description: 'Create users',
  },
  {
    key: USERS_PERMISSIONS.UPDATE,
    description: 'Update users',
  },
  {
    key: USERS_PERMISSIONS.DELETE,
    description: 'Delete users',
  },
  {
    key: ROLES_PERMISSIONS.READ,
    description: 'View roles, role permissions and the permission catalog',
  },
  {
    key: ROLES_PERMISSIONS.CREATE,
    description: 'Create roles',
  },
  {
    key: ROLES_PERMISSIONS.UPDATE,
    description: 'Update roles',
  },
  {
    key: ROLES_PERMISSIONS.DELETE,
    description: 'Delete roles',
  },
  {
    key: ROLES_PERMISSIONS.ASSIGN_PERMISSIONS,
    description: 'Replace the permission set of a role',
  },
  {
    key: ROLES_PERMISSIONS.ASSIGN_USERS,
    description: 'Assign one role to a user',
  },
] as const;

export type PermissionDefinition = (typeof PERMISSION_DEFINITIONS)[number];
export type PermissionKey = PermissionDefinition['key'];

/**
 * Every catalog key goes to admin, so there is only one list to maintain.
 */
export const ADMIN_PERMISSION_KEYS: readonly string[] =
  PERMISSION_DEFINITIONS.map(({ key }) => key);

export const USER_PERMISSION_KEYS: readonly string[] = [USERS_PERMISSIONS.READ];
