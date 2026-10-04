import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  findUserBySupabaseUserId(supabaseUserId: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { supabaseUserId },
      relations: { role: true },
    });
  }

  async userHasPermission(
    supabaseUserId: string,
    permissionKey: string,
  ): Promise<boolean> {
    const matches = await this.usersRepository
      .createQueryBuilder('authUser')
      .innerJoin('authUser.role', 'role')
      .innerJoin('role.permissions', 'permission')
      .where('"authUser"."supabaseUserId" = :supabaseUserId', {
        supabaseUserId,
      })
      .andWhere('"authUser"."isActive" = true')
      .andWhere('permission."key" = :permissionKey', { permissionKey })
      .getCount();

    return matches > 0;
  }

  async userPermissionKeys(supabaseUserId: string): Promise<string[]> {
    const rows = await this.usersRepository
      .createQueryBuilder('authUser')
      .select('permission."key"', 'key')
      .innerJoin('authUser.role', 'role')
      .innerJoin('role.permissions', 'permission')
      .where('"authUser"."supabaseUserId" = :supabaseUserId', {
        supabaseUserId,
      })
      .andWhere('"authUser"."isActive" = true')
      .orderBy('permission."key"', 'ASC')
      .getRawMany<{ key: string }>();

    return rows.map((row) => row.key);
  }
}
