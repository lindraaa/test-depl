import { SetMetadata } from '@nestjs/common';

export const PERMISSION_METADATA = 'permission';

/**
 * Declares the permission a route requires. The route is authorized through
 * the permissions of the current user's role, never through a role name.
 *
 * The route must also be authenticated, for example:
 * `@UseGuards(SupabaseAuthGuard, PermissionsGuard)`.
 *
 * @example
 * @Get()
 * @RequirePermission(USERS_PERMISSIONS.READ)
 * findAll() { ... }
 */
export const RequirePermission = (permission: string): MethodDecorator =>
  SetMetadata(PERMISSION_METADATA, permission);
