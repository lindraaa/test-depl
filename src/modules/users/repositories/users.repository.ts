import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, QueryDeepPartialEntity, Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { UserEntity } from '../entities/user.entity';

export type CreateUserProfile = Pick<
  UserEntity,
  'email' | 'supabaseUserId' | 'roleId'
> &
  Partial<Pick<UserEntity, 'firstName' | 'lastName' | 'isActive'>>;

@Injectable()
export class UsersRepository extends BaseRepository<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    repository: Repository<UserEntity>,
  ) {
    super(repository);
  }

  findAllPaginatedWithRole(pagination: {
    skip: number;
    limit: number;
  }): Promise<[UserEntity[], number]> {
    return this.repository.findAndCount({
      skip: pagination.skip,
      take: pagination.limit,
      relations: { role: true },
    });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: { role: true },
    });
  }

  findBySupabaseUserId(supabaseUserId: string): Promise<UserEntity | null> {
    return this.repository.findOne({
      where: { supabaseUserId },
      relations: { role: true },
    });
  }

  async create(data: DeepPartial<UserEntity>): Promise<UserEntity> {
    const user = await this.repository.save(this.repository.create(data));
    const created = await this.findById(user.id);

    if (!created) {
      throw new Error(`User "${user.id}" could not be loaded after creation`);
    }

    return created;
  }

  async createProfile(profile: CreateUserProfile): Promise<UserEntity> {
    const user = await this.repository.save(
      this.repository.create({
        ...profile,
        firstName: profile.firstName ?? null,
        lastName: profile.lastName ?? null,
        isActive: profile.isActive ?? true,
      }),
    );
    const created = await this.findById(user.id);

    if (!created) {
      throw new Error(`User "${user.id}" could not be loaded after creation`);
    }

    return created;
  }

  async assignRole(id: string, roleId: string): Promise<UserEntity | null> {
    await this.repository.update(id, {
      roleId,
    } satisfies QueryDeepPartialEntity<UserEntity>);

    return this.findById(id);
  }
}
