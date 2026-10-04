import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ApiEnvelopeOkResponse,
} from '../../../common/decorators/api-envelope.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ROLES_PERMISSIONS } from '../../../common/constants/permissions';
import { apiResponse } from '../../../common/utils/api-response';
import type { ApiResponse } from '../../../shared/interfaces/api-response.interface';
import { SupabaseAuthGuard } from '../../auth/guards/supabase-auth.guard';
import { PermissionEntity } from '../entities/permission.entity';
import { PermissionsGuard } from '../guards/permissions.guard';
import { PermissionsService } from '../services/permissions.service';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(SupabaseAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermission(ROLES_PERMISSIONS.READ)
  @ApiEnvelopeOkResponse(PermissionEntity, {
    description: 'Permission catalog available for role configuration',
    isArray: true,
  })
  async findAll(): Promise<ApiResponse<PermissionEntity[]>> {
    const permissions = await this.permissionsService.findAll();
    return apiResponse(permissions, 'Permissions retrieved successfully');
  }
}
