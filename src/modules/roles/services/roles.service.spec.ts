import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  ADMINISTRATIVE_PERMISSION,
  ROLES_PERMISSIONS,
  SYSTEM_ROLE_ADMIN,
  SYSTEM_ROLE_USER,
  USERS_PERMISSIONS,
} from '../../../common/constants/permissions';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';
import type { PermissionsRepository } from '../repositories/permissions.repository';
import type { RolesRepository } from '../repositories/roles.repository';
import { RolesService } from './roles.service';

const ROLE_ID = '44444444-4444-4444-8444-444444444444';
const ADMIN_PERMISSION_ID = '55555555-5555-4555-8555-555555555555';
const READ_PERMISSION_ID = '66666666-6666-4666-8666-666666666666';

function permission(id: string, key: string): PermissionEntity {
  return {
    id,
    key,
    description: null,
    roles: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function role(overrides: Partial<RoleEntity> = {}): RoleEntity {
  return {
    id: ROLE_ID,
    name: 'veterinarian',
    description: null,
    isSystemRole: false,
    permissions: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('RolesService', () => {
  let rolesRepository: jest.Mocked<RolesRepository>;
  let permissionsRepository: jest.Mocked<PermissionsRepository>;
  let service: RolesService;

  beforeEach(() => {
    rolesRepository = {
      findAll: jest.fn(async () => []),
      findById: jest.fn(async () => null),
      findByName: jest.fn(async () => null),
      create: jest.fn(async (data) => role(data as Partial<RoleEntity>)),
      update: jest.fn(async (_id, data) => role(data as Partial<RoleEntity>)),
      delete: jest.fn(async () => undefined),
      replacePermissions: jest.fn(async () => role()),
      countRolesWithPermission: jest.fn(async () => 0),
      countUsersByRole: jest.fn(async () => 0),
    } as unknown as jest.Mocked<RolesRepository>;

    permissionsRepository = {
      findAllSorted: jest.fn(async () => []),
      findByKeys: jest.fn(async () => []),
      findByKey: jest.fn(async () => null),
    } as unknown as jest.Mocked<PermissionsRepository>;

    service = new RolesService(rolesRepository, permissionsRepository);
  });

  it('creates a non-system role', async () => {
    const created = await service.create({
      name: 'veterinarian',
      description: 'Veterinary staff',
    });

    expect(rolesRepository.create).toHaveBeenCalledWith({
      name: 'veterinarian',
      description: 'Veterinary staff',
      isSystemRole: false,
      permissions: [],
    });
    expect(created.isSystemRole).toBe(false);
  });

  it('rejects a duplicate role name', async () => {
    rolesRepository.findByName.mockResolvedValue(
      role({ name: SYSTEM_ROLE_ADMIN, isSystemRole: true }),
    );

    await expect(
      service.create({ name: 'admin', description: 'x' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('refuses to rename a system role', async () => {
    rolesRepository.findById.mockResolvedValue(
      role({ name: SYSTEM_ROLE_ADMIN, isSystemRole: true }),
    );

    await expect(
      service.update(ROLE_ID, { name: 'superadmin' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('allows renaming a non-system role to a free name', async () => {
    rolesRepository.findById.mockResolvedValue(role());
    rolesRepository.findByName.mockResolvedValue(null);
    rolesRepository.update.mockResolvedValue(role({ name: 'clinical-staff' }));

    const updated = await service.update(ROLE_ID, { name: 'clinical-staff' });

    expect(updated.name).toBe('clinical-staff');
  });

  it('refuses to delete a system role', async () => {
    rolesRepository.findById.mockResolvedValue(
      role({ name: SYSTEM_ROLE_USER, isSystemRole: true }),
    );

    await expect(service.delete(ROLE_ID)).rejects.toMatchObject({
      status: 409,
    });
    expect(rolesRepository.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete a role that still has users', async () => {
    rolesRepository.findById.mockResolvedValue(role());
    rolesRepository.countUsersByRole.mockResolvedValue(3);

    await expect(service.delete(ROLE_ID)).rejects.toMatchObject({
      status: 409,
    });
    expect(rolesRepository.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete the last role holding the administrative permission', async () => {
    rolesRepository.findById.mockResolvedValue(
      role({
        permissions: [
          permission(ADMIN_PERMISSION_ID, ADMINISTRATIVE_PERMISSION),
        ],
      }),
    );
    rolesRepository.countUsersByRole.mockResolvedValue(0);
    rolesRepository.countRolesWithPermission.mockResolvedValue(1);

    await expect(service.delete(ROLE_ID)).rejects.toMatchObject({
      status: 409,
    });
    expect(rolesRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes a role that is not the last administrative one', async () => {
    rolesRepository.findById.mockResolvedValue(
      role({
        permissions: [
          permission(ADMIN_PERMISSION_ID, ADMINISTRATIVE_PERMISSION),
        ],
      }),
    );
    rolesRepository.countUsersByRole.mockResolvedValue(0);
    rolesRepository.countRolesWithPermission.mockResolvedValue(2);

    await expect(service.delete(ROLE_ID)).resolves.toBeUndefined();
    expect(rolesRepository.delete).toHaveBeenCalledWith(ROLE_ID);
  });

  it('rejects unknown permission keys without touching the database', async () => {
    rolesRepository.findById.mockResolvedValue(role());
    permissionsRepository.findByKeys.mockResolvedValue([
      permission(READ_PERMISSION_ID, USERS_PERMISSIONS.READ),
    ]);

    await expect(
      service.replacePermissions(ROLE_ID, {
        permissionKeys: [USERS_PERMISSIONS.READ, 'not:a:permission'],
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(rolesRepository.replacePermissions).not.toHaveBeenCalled();
  });

  it('replaces the whole permission set in one repository call', async () => {
    const stored = [
      permission(READ_PERMISSION_ID, USERS_PERMISSIONS.READ),
      permission(ADMIN_PERMISSION_ID, ROLES_PERMISSIONS.READ),
    ];
    rolesRepository.findById.mockResolvedValue(role());
    permissionsRepository.findByKeys.mockResolvedValue(stored);
    rolesRepository.replacePermissions.mockResolvedValue(
      role({ permissions: stored }),
    );

    const updated = await service.replacePermissions(ROLE_ID, {
      permissionKeys: [ROLES_PERMISSIONS.READ, USERS_PERMISSIONS.READ],
    });

    expect(rolesRepository.replacePermissions).toHaveBeenCalledTimes(1);
    expect(rolesRepository.replacePermissions).toHaveBeenCalledWith(
      ROLE_ID,
      stored,
    );
    expect(updated.permissions).toHaveLength(2);
  });

  it('refuses to strip the administrative permission from the last administrative role', async () => {
    rolesRepository.findById.mockResolvedValue(
      role({
        permissions: [
          permission(ADMIN_PERMISSION_ID, ADMINISTRATIVE_PERMISSION),
        ],
      }),
    );
    permissionsRepository.findByKeys.mockResolvedValue([
      permission(READ_PERMISSION_ID, USERS_PERMISSIONS.READ),
    ]);
    permissionsRepository.findByKey.mockResolvedValue(
      permission(ADMIN_PERMISSION_ID, ADMINISTRATIVE_PERMISSION),
    );
    rolesRepository.countRolesWithPermission.mockResolvedValue(1);

    await expect(
      service.replacePermissions(ROLE_ID, {
        permissionKeys: [USERS_PERMISSIONS.READ],
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(rolesRepository.replacePermissions).not.toHaveBeenCalled();
  });

  it('resolves the default role id for self-registered profiles', async () => {
    rolesRepository.findByName.mockResolvedValue(
      role({ name: SYSTEM_ROLE_USER, isSystemRole: true }),
    );

    await expect(service.getDefaultRoleId()).resolves.toBe(ROLE_ID);
    expect(rolesRepository.findByName).toHaveBeenCalledWith(SYSTEM_ROLE_USER);
  });

  it('fails loudly when the default role is missing', async () => {
    rolesRepository.findByName.mockResolvedValue(null);

    await expect(service.getDefaultRoleId()).rejects.toMatchObject({
      status: 404,
    });
  });
});
