import {
  ExecutionContext,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type {
  AuthenticatedSupabaseRequest,
  SupabaseAuthContext,
} from '../types/authenticated-request.type';

export const CurrentSupabaseAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SupabaseAuthContext => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedSupabaseRequest>();

    if (!request.supabaseAuth) {
      throw new UnauthorizedException('Authentication context is missing');
    }

    return request.supabaseAuth;
  },
);
