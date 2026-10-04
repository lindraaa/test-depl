import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { SYSTEM_ROLE_USER } from '../../../common/constants/permissions';
import { RoleEntity } from '../../roles/entities/role.entity';
import type { RolesService } from '../../roles/services/roles.service';
import { UserEntity } from '../entities/user.entity';
import type { UsersRepository } from '../repositories/users.repository';
import { UsersService } from './users.service';

const USER_ID = '77777777-7777-4777-8777-777777777777';
const OTHER_SUPABASE_ID = '88888888-8888-4888-8888-888888888888';
const DEFAULT_ROLE_ID = '99999999-9999-4999-8999-999999999999';
const VET_ROLE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function user(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    id: USER_ID,
    supabaseUserId: OTHER_SUPABASE_ID,
    email: 'user@example.com',
    firstName: null,
    lastName: null,
    isActive: true,
    roleId: DEFAULT_ROLE_ID,
    role: { id: DEFAULT_ROLE_ID, name: SYSTEM_ROLE_USER } as RoleEntity,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function role(id: string, name: string): RoleEntity {
  return { id, name, isSystemRole: false, permissions: [] } as RoleEntity;
}

describe('UsersService', () => {
  let usersRepository: jest.Mocked<UsersRepository>;
  let rolesService: jest.Mocked<RolesService>;
  let service: UsersService;

  beforeEach(() => {
    usersRepository = {
      findAllPaginatedWithRole: jest.fn(async () => [[], 0]),
      findById: jest.fn(async () => null),
      findBySupabaseUserId: jest.fn(async () => null),
      create: jest.fn(async (data) => user(data as Partial<UserEntity>)),
      createProfile: jest.fn(async (data) => user(data as Partial<UserEntity>)),
      update: jest.fn(async () => user()),
      delete: jest.fn(async () => undefined),
      assignRole: jest.fn(async () => user()),
    } as unknown as jest.Mocked<UsersRepository>;

    rolesService = {
      getDefaultRoleId: jest.fn(async () => DEFAULT_ROLE_ID),
      findById: jest.fn(async (id: string) => role(id, 'veterinarian')),
    } as unknown as jest.Mocked<RolesService>;

    service = new UsersService(usersRepository, rolesService);
  });

  it('assigns the default role when a profile is created through registration', async () => {
    await service.createProfile({
      supabaseUserId: OTHER_SUPABASE_ID,
      email: 'new@example.com',
    });

    expect(usersRepository.createProfile).toHaveBeenCalledWith({
      supabaseUserId: OTHER_SUPABASE_ID,
      email: 'new@example.com',
      roleId: DEFAULT_ROLE_ID,
    });
  });

  it('assigns the default role when an administrator creates a user', async () => {
    await service.create({ email: 'new@example.com' });

    expect(usersRepository.create).toHaveBeenCalledWith({
      email: 'new@example.com',
      supabaseUserId: null,
      roleId: DEFAULT_ROLE_ID,
    });
  });

  it('never lets a request body choose the role of a new user', async () => {
    await service.create({
      email: 'new@example.com',
      role: 'admin',
    } as never);

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: DEFAULT_ROLE_ID }),
    );
  });

  it('validates the role before assigning it to a user', async () => {
    usersRepository.findById.mockResolvedValue(user());
    rolesService.findById.mockRejectedValue(
      Object.assign(new Error('Role not found'), { status: 404 }),
    );

    await expect(
      service.assignRole(USER_ID, VET_ROLE_ID, OTHER_SUPABASE_ID),
    ).rejects.toMatchObject({ status: 404 });
    expect(usersRepository.assignRole).not.toHaveBeenCalled();
  });

  it('assigns a validated role to a user', async () => {
    usersRepository.findById.mockResolvedValue(user());
    usersRepository.assignRole.mockResolvedValue(
      user({ roleId: VET_ROLE_ID, role: role(VET_ROLE_ID, 'veterinarian') }),
    );

    const updated = await service.assignRole(USER_ID, VET_ROLE_ID);

    expect(usersRepository.assignRole).toHaveBeenCalledWith(
      USER_ID,
      VET_ROLE_ID,
    );
    expect(updated.roleId).toBe(VET_ROLE_ID);
  });

  it('prevents a user from changing their own role', async () => {
    usersRepository.findBySupabaseUserId.mockResolvedValue(user());

    await expect(
      service.assignRole(USER_ID, VET_ROLE_ID, OTHER_SUPABASE_ID),
    ).rejects.toMatchObject({ status: 403 });
    expect(usersRepository.assignRole).not.toHaveBeenCalled();
  });
});
