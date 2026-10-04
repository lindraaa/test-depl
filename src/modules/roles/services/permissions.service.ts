import { Injectable } from '@nestjs/common';
import { PermissionEntity } from '../entities/permission.entity';
import { PermissionsRepository } from '../repositories/permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  findAll(): Promise<PermissionEntity[]> {
    return this.permissionsRepository.findAllSorted();
  }

  findByKeys(keys: string[]): Promise<PermissionEntity[]> {
    return this.permissionsRepository.findByKeys(keys);
  }

  findByKey(key: string): Promise<PermissionEntity | null> {
    return this.permissionsRepository.findByKey(key);
  }
}
