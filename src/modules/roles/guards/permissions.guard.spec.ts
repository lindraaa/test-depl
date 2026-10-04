import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, jest } from '@jest/globals';
import { PERMISSION_METADATA } from '../../../common/decorators/require-permission.decorator';
import {
  ROLES_PERMISSIONS,
  USERS_PERMISSIONS,
} from '../../../common/constants/permissions';
import type { UserEntity } from '../../users/entities/user.entity';
import type { AuthenticatedSupabaseRequest } from '../../auth/types/authenticated-request.type';
import { PermissionsGuard } from './permissions.guard';
import type { AuthorizationService } from '../services/authorization.service';

const SUPABASE_USER_ID = '11111111-1111-4111-8111-111111111111';

function user(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    supabaseUserId: SUPABASE_USER_ID,
    email: 'user@example.com',
    firstName: null,
    lastName: null,
    isActive: true,
    roleId: '33333333-3333-4333-8333-333333333333',
    role: undefined,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function context(
  options: {
    metadata?: string;
    supabaseUserId?: string | null;
  } = {},
): ExecutionContext {
  const request = {
    supabaseAuth:
      options.supabaseUserId === null || options.supabaseUserId === undefined
        ? undefined
        : {
            accessToken: 'token',
            user: { id: options.supabaseUserId },
          },
  } as AuthenticatedSupabaseRequest;

  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function reflectorWith(permission?: string): Reflector {
  const reflector = new Reflector();

  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key: unknown) =>
      key === PERMISSION_METADATA ? permission : undefined,
    );

  return reflector;
}

function authorizationServiceStub(
  overrides: Partial<AuthorizationService> = {},
): AuthorizationService {
  return {
    findUserBySupabaseUserId: jest.fn(async () => user()),
    userHasPermission: jest.fn(async () => true),
    userPermissionKeys: jest.fn(async () => []),
    ...overrides,
  } as unknown as AuthorizationService;
}

describe('PermissionsGuard', () => {
  it('throws when the route does not declare a required permission', async () => {
    const guard = new PermissionsGuard(
      reflectorWith(undefined),
      authorizationServiceStub(),
    );

    await expect(guard.canActivate(context())).rejects.toThrow(
      /does not declare a required permission/,
    );
  });

  it('throws UnauthorizedException when the authentication context is missing', async () => {
    const guard = new PermissionsGuard(
      reflectorWith(USERS_PERMISSIONS.READ),
      authorizationServiceStub(),
    );

    await expect(
      guard.canActivate(context({ supabaseUserId: null })),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('throws ForbiddenException when the local profile does not exist', async () => {
    const authorizationService = authorizationServiceStub({
      findUserBySupabaseUserId: jest.fn(async () => null),
    });
    const guard = new PermissionsGuard(
      reflectorWith(USERS_PERMISSIONS.READ),
      authorizationService,
    );

    await expect(
      guard.canActivate(context({ supabaseUserId: SUPABASE_USER_ID })),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('throws ForbiddenException for an inactive user before checking permissions', async () => {
    const userHasPermission = jest.fn(async () => true);
    const authorizationService = authorizationServiceStub({
      findUserBySupabaseUserId: jest.fn(async () => user({ isActive: false })),
      userHasPermission,
    });
    const guard = new PermissionsGuard(
      reflectorWith(USERS_PERMISSIONS.READ),
      authorizationService,
    );

    await expect(
      guard.canActivate(context({ supabaseUserId: SUPABASE_USER_ID })),
    ).rejects.toMatchObject({ status: 403 });
    expect(userHasPermission).not.toHaveBeenCalled();
  });

  it('grants access when the role owns the required permission', async () => {
    const userHasPermission = jest.fn(async () => true);
    const guard = new PermissionsGuard(
      reflectorWith(ROLES_PERMISSIONS.ASSIGN_PERMISSIONS),
      authorizationServiceStub({ userHasPermission }),
    );

    await expect(
      guard.canActivate(context({ supabaseUserId: SUPABASE_USER_ID })),
    ).resolves.toBe(true);
    expect(userHasPermission).toHaveBeenCalledWith(
      SUPABASE_USER_ID,
      ROLES_PERMISSIONS.ASSIGN_PERMISSIONS,
    );
  });

  it('throws ForbiddenException when the role lacks the required permission', async () => {
    const guard = new PermissionsGuard(
      reflectorWith(USERS_PERMISSIONS.DELETE),
      authorizationServiceStub({
        userHasPermission: jest.fn(async () => false),
      }),
    );

    await expect(
      guard.canActivate(context({ supabaseUserId: SUPABASE_USER_ID })),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('re-reads permissions on every request so database changes take effect', async () => {
    const userHasPermission = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const guard = new PermissionsGuard(
      reflectorWith(USERS_PERMISSIONS.READ),
      authorizationServiceStub({ userHasPermission }),
    );
    const executionContext = context({ supabaseUserId: SUPABASE_USER_ID });

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    await expect(guard.canActivate(executionContext)).rejects.toMatchObject({
      status: 403,
    });
    expect(userHasPermission).toHaveBeenCalledTimes(2);
  });
});
