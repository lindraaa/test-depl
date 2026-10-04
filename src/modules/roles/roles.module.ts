import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { PermissionsController } from './controllers/permissions.controller';
import { RolesController } from './controllers/roles.controller';
import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionsRepository } from './repositories/permissions.repository';
import { RolesRepository } from './repositories/roles.repository';
import { AuthorizationService } from './services/authorization.service';
import { PermissionsService } from './services/permissions.service';
import { RolesService } from './services/roles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RoleEntity, PermissionEntity]),
  ],
  controllers: [RolesController, PermissionsController],
  providers: [
    RolesService,
    RolesRepository,
    PermissionsService,
    PermissionsRepository,
    AuthorizationService,
    PermissionsGuard,
  ],
  exports: [
    RolesService,
    PermissionsService,
    AuthorizationService,
    PermissionsGuard,
  ],
})
export class RolesModule {}
