import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_METADATA } from '../../../common/decorators/require-permission.decorator';
import type { AuthenticatedSupabaseRequest } from '../../auth/types/authenticated-request.type';
import { AuthorizationService } from '../services/authorization.service';

/**
 * Authorizes a route through the permissions of the current user's role.
 *
 * Routes must be authenticated first:
 * `@UseGuards(SupabaseAuthGuard, PermissionsGuard)`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_METADATA,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      throw new InternalServerErrorException(
        'The route does not declare a required permission',
      );
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedSupabaseRequest>();
    const supabaseUserId = request.supabaseAuth?.user?.id;

    if (!supabaseUserId) {
      throw new UnauthorizedException('Authentication context is missing');
    }

    const user =
      await this.authorizationService.findUserBySupabaseUserId(supabaseUserId);

    if (!user) {
      throw new ForbiddenException('User profile is not provisioned');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    const allowed = await this.authorizationService.userHasPermission(
      supabaseUserId,
      requiredPermission,
    );

    if (!allowed) {
      throw new ForbiddenException(
        `Missing required permission: ${requiredPermission}`,
      );
    }

    return true;
  }
}
