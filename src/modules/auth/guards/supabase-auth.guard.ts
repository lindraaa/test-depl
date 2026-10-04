import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SUPABASE_CLIENT } from '../../../config/supabase.provider';
import type { SupabaseClient } from '../../../config/supabase.provider';
import type { AuthenticatedSupabaseRequest } from '../types/authenticated-request.type';

function errorStatus(error: unknown): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }

  return undefined;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabaseClient: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedSupabaseRequest>();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const match = /^Bearer\s+(\S+)$/i.exec(authorization);
    if (!match) {
      throw new UnauthorizedException('Malformed bearer token');
    }

    const accessToken = match[1];
    if (!accessToken) {
      throw new UnauthorizedException('Malformed bearer token');
    }

    try {
      const { data, error } =
        await this.supabaseClient.auth.getUser(accessToken);

      if (error) {
        const status = errorStatus(error);
        if (
          status === 0 ||
          status === 429 ||
          (status !== undefined && status >= 500)
        ) {
          throw new ServiceUnavailableException(
            'Supabase authentication service is unavailable',
          );
        }
        throw new UnauthorizedException('Invalid or expired bearer token');
      }

      if (!data.user) {
        throw new UnauthorizedException('Invalid or expired bearer token');
      }

      request.supabaseAuth = {
        accessToken,
        user: data.user,
      };

      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      throw new ServiceUnavailableException(
        'Supabase authentication service is unavailable',
      );
    }
  }
}
