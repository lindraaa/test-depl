import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  ApiEnvelopeOkResponse,
} from '../../../common/decorators/api-envelope.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { PaginationDto } from '../../../common/dto/paginated.dto';
import { apiResponse } from '../../../common/utils/api-response';
import { paginatedResponse } from '../../../common/utils/api-response';
import { ROLES_PERMISSIONS } from '../../../common/constants/permissions';
import type { ApiResponse } from '../../../shared/interfaces/api-response.interface';
import { SupabaseAuthGuard } from '../../auth/guards/supabase-auth.guard';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { PermissionEntity } from '../entities/permission.entity';
import { RoleEntity } from '../entities/role.entity';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesService } from '../services/roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(SupabaseAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission(ROLES_PERMISSIONS.READ)
  @ApiEnvelopeOkResponse(RoleEntity, {
    description: 'List of roles',
    isArray: true,
  })
  async findAll(
    @Query() query?: PaginationDto,
  ): Promise<ApiResponse<RoleEntity[]>> {
    const { data, meta } = await this.rolesService.findAll(query);
    return paginatedResponse(data, meta, 'Roles retrieved successfully');
  }

  @Get(':id')
  @RequirePermission(ROLES_PERMISSIONS.READ)
  @ApiEnvelopeOkResponse(RoleEntity, { description: 'Role found' })
  async findById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<RoleEntity>> {
    const role = await this.rolesService.findById(id);
    return apiResponse(role, 'Role retrieved successfully');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(ROLES_PERMISSIONS.CREATE)
  @ApiEnvelopeOkResponse(RoleEntity, {
    description: 'Role created',
    status: HttpStatus.CREATED,
  })
  async create(@Body() dto: CreateRoleDto): Promise<ApiResponse<RoleEntity>> {
    const role = await this.rolesService.create(dto);
    return apiResponse(role, 'Role created successfully', HttpStatus.CREATED);
  }

  @Put(':id')
  @RequirePermission(ROLES_PERMISSIONS.UPDATE)
  @ApiEnvelopeOkResponse(RoleEntity, { description: 'Role updated' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<ApiResponse<RoleEntity>> {
    const role = await this.rolesService.update(id, dto);
    return apiResponse(role, 'Role updated successfully');
  }

  @Delete(':id')
  @RequirePermission(ROLES_PERMISSIONS.DELETE)
  @ApiOkResponse({
    description: 'Role deleted',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Role deleted successfully' },
        data: { type: 'null' },
        meta: { type: 'null' },
      },
      required: ['status', 'message', 'data', 'meta'],
    },
  })
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<null>> {
    await this.rolesService.delete(id);
    return apiResponse(null, 'Role deleted successfully');
  }

  @Get(':id/permissions')
  @RequirePermission(ROLES_PERMISSIONS.READ)
  @ApiEnvelopeOkResponse(PermissionEntity, {
    description: 'Permissions assigned to the role',
    isArray: true,
  })
  async getPermissions(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<PermissionEntity[]>> {
    const permissions = await this.rolesService.getPermissions(id);
    return apiResponse(permissions, 'Role permissions retrieved successfully');
  }

  @Put(':id/permissions')
  @RequirePermission(ROLES_PERMISSIONS.ASSIGN_PERMISSIONS)
  @ApiEnvelopeOkResponse(RoleEntity, {
    description: 'Role with its replaced permission set',
  })
  async replacePermissions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ): Promise<ApiResponse<RoleEntity>> {
    const role = await this.rolesService.replacePermissions(id, dto);
    return apiResponse(role, 'Role permissions replaced successfully');
  }
}
