import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PermissionEntity } from '../entities/permission.entity';

@Injectable()
export class PermissionsRepository extends BaseRepository<PermissionEntity> {
  constructor(
    @InjectRepository(PermissionEntity)
    repository: Repository<PermissionEntity>,
  ) {
    super(repository);
  }

  findAllSorted(): Promise<PermissionEntity[]> {
    return this.repository.find({ order: { key: 'ASC' } });
  }

  async findByKeys(keys: string[]): Promise<PermissionEntity[]> {
    if (keys.length === 0) {
      return [];
    }

    return this.repository.find({ where: { key: In(keys) } });
  }

  findByKey(key: string): Promise<PermissionEntity | null> {
    return this.repository.findOne({ where: { key } });
  }
}
