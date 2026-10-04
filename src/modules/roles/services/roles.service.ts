import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ADMINISTRATIVE_PERMISSION,
  DEFAULT_USER_ROLE,
} from '../../../common/constants/permissions';
import { PaginationDto } from '../../../common/dto/paginated.dto';
import { ApiMeta } from '../../../shared/interfaces/api-response.interface';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';
import { PermissionsRepository } from '../repositories/permissions.repository';
import { RolesRepository } from '../repositories/roles.repository';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsRepository: PermissionsRepository,
  ) {}

  async findAll(
    query: PaginationDto = new PaginationDto(),
  ): Promise<{ data: RoleEntity[]; meta: ApiMeta }> {
    const [data, total] = await this.rolesRepository.findAllPaginated(query);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findById(roleId: string): Promise<RoleEntity> {
    const role = await this.rolesRepository.findById(roleId);

    if (!role) {
      throw new NotFoundException(`Role with id "${roleId}" was not found`);
    }

    return role;
  }

  async findByName(name: string): Promise<RoleEntity | null> {
    return this.rolesRepository.findByName(name);
  }

  async getDefaultRoleId(): Promise<string> {
    const role = await this.rolesRepository.findByName(DEFAULT_USER_ROLE);

    if (!role) {
      throw new NotFoundException(
        `The default role "${DEFAULT_USER_ROLE}" is missing. Run the RBAC migrations.`,
      );
    }

    return role.id;
  }

  async create(dto: CreateRoleDto): Promise<RoleEntity> {
    const name = dto.name.trim();
    const existing = await this.rolesRepository.findByName(name);

    if (existing) {
      throw new ConflictException(`Role with name "${name}" already exists`);
    }

    const role = await this.rolesRepository.create({
      name,
      description: dto.description?.trim() || null,
      isSystemRole: false,
      permissions: [],
    });

    this.logger.log(`Role "${role.name}" was created`);

    return role;
  }

  async update(roleId: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    const role = await this.findById(roleId);
    const nextName = dto.name?.trim();

    if (nextName && nextName !== role.name) {
      if (role.isSystemRole) {
        throw new ConflictException(
          `System role "${role.name}" cannot be renamed`,
        );
      }

      const existing = await this.rolesRepository.findByName(nextName);

      if (existing) {
        throw new ConflictException(
          `Role with name "${nextName}" already exists`,
        );
      }
    }

    const updated = await this.rolesRepository.update(roleId, {
      name: nextName,
      description:
        dto.description === undefined
          ? undefined
          : dto.description.trim() || null,
    });

    if (!updated) {
      throw new NotFoundException(`Role with id "${roleId}" was not found`);
    }

    this.logger.log(`Role "${role.name}" was updated`);

    return updated;
  }

  async delete(roleId: string): Promise<void> {
    const role = await this.findById(roleId);

    if (role.isSystemRole) {
      throw new ConflictException(
        `System role "${role.name}" cannot be deleted`,
      );
    }

    await this.assertRoleCanBeRemoved(role);

    await this.rolesRepository.delete(roleId);

    this.logger.log(`Role "${role.name}" was deleted`);
  }

  async getPermissions(roleId: string): Promise<PermissionEntity[]> {
    const role = await this.findById(roleId);

    return [...(role.permissions ?? [])].sort((left, right) =>
      left.key.localeCompare(right.key),
    );
  }

  async replacePermissions(
    roleId: string,
    dto: UpdateRolePermissionsDto,
  ): Promise<RoleEntity> {
    const role = await this.findById(roleId);
    const permissionKeys = [
      ...new Set(dto.permissionKeys.map((key) => key.trim())),
    ];

    const permissions =
      await this.permissionsRepository.findByKeys(permissionKeys);
    const resolvedKeys = new Set(
      permissions.map((permission) => permission.key),
    );
    const unknownKeys = permissionKeys.filter((key) => !resolvedKeys.has(key));

    if (unknownKeys.length > 0) {
      throw new BadRequestException(
        `Unknown permission keys: ${unknownKeys.join(', ')}`,
      );
    }

    await this.assertAdministrativePermissionIsPreserved(role, resolvedKeys);

    const updated = await this.rolesRepository.replacePermissions(
      roleId,
      permissions,
    );

    if (!updated) {
      throw new NotFoundException(`Role with id "${roleId}" was not found`);
    }

    this.logger.log(
      `Role "${role.name}" permissions were replaced with [${[...resolvedKeys].sort().join(', ')}]`,
    );

    return updated;
  }

  private async assertRoleCanBeRemoved(role: RoleEntity): Promise<void> {
    const userCount = await this.rolesRepository.countUsersByRole(role.id);

    if (userCount > 0) {
      throw new ConflictException(
        `Role "${role.name}" still has ${userCount} user(s) assigned`,
      );
    }

    const administrativePermission = role.permissions?.find(
      (permission) => permission.key === ADMINISTRATIVE_PERMISSION,
    );

    if (administrativePermission) {
      const administrativeRoleCount =
        await this.rolesRepository.countRolesWithPermission(
          administrativePermission.id,
        );

      if (administrativeRoleCount <= 1) {
        throw new ConflictException(
          `Role "${role.name}" is the last role with "${ADMINISTRATIVE_PERMISSION}" and cannot be deleted`,
        );
      }
    }
  }

  private async assertAdministrativePermissionIsPreserved(
    role: RoleEntity,
    nextPermissionKeys: Set<string>,
  ): Promise<void> {
    const keepsPermission = nextPermissionKeys.has(ADMINISTRATIVE_PERMISSION);
    const hasPermission = (role.permissions ?? []).some(
      (permission) => permission.key === ADMINISTRATIVE_PERMISSION,
    );

    if (!hasPermission || keepsPermission) {
      return;
    }

    const administrativePermission = await this.permissionsRepository.findByKey(
      ADMINISTRATIVE_PERMISSION,
    );

    if (!administrativePermission) {
      return;
    }

    const administrativeRoleCount =
      await this.rolesRepository.countRolesWithPermission(
        administrativePermission.id,
      );

    if (administrativeRoleCount <= 1) {
      throw new ConflictException(
        `Role "${role.name}" is the last role with "${ADMINISTRATIVE_PERMISSION}"`,
      );
    }
  }
}
