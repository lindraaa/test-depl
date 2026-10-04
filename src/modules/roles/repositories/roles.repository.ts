import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, DataSource, Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PaginationDto } from '../../../common/dto/paginated.dto';
import { UserEntity } from '../../users/entities/user.entity';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';

@Injectable()
export class RolesRepository extends BaseRepository<RoleEntity> {
  constructor(
    @InjectRepository(RoleEntity)
    repository: Repository<RoleEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super(repository);
  }

  findAllPaginated(
    pagination: PaginationDto,
  ): Promise<[RoleEntity[], number]> {
    return this.repository.findAndCount({
      skip: pagination.skip,
      take: pagination.limit,
      relations: { permissions: true },
      order: { name: 'ASC' },
    });
  }

  findById(id: string): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: { permissions: true },
    });
  }

  findByName(name: string): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: { name },
      relations: { permissions: true },
    });
  }

  async create(data: DeepPartial<RoleEntity>): Promise<RoleEntity> {
    const role = await this.repository.save(this.repository.create(data));
    const created = await this.findById(role.id);

    if (!created) {
      throw new Error(`Role "${role.id}" could not be loaded after creation`);
    }

    return created;
  }

  async replacePermissions(
    roleId: string,
    permissions: PermissionEntity[],
  ): Promise<RoleEntity | null> {
    return this.dataSource.transaction(async (manager) => {
      const role = await manager.findOne(RoleEntity, {
        where: { id: roleId },
        relations: { permissions: true },
      });

      if (!role) {
        return null;
      }

      role.permissions = permissions;
      await manager.save(role);

      return manager.findOne(RoleEntity, {
        where: { id: roleId },
        relations: { permissions: true },
      });
    });
  }

  countRolesWithPermission(permissionId: string): Promise<number> {
    return this.repository
      .createQueryBuilder('role')
      .innerJoin('role.permissions', 'permission')
      .where('permission.id = :permissionId', { permissionId })
      .getCount();
  }

  countUsersByRole(roleId: string): Promise<number> {
    return this.dataSource.getRepository(UserEntity).count({
      where: { roleId },
    });
  }
}
