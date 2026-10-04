import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../shared/interfaces/api-response.interface';
import {
  apiResponse,
  paginatedResponse,
} from '../../../common/utils/api-response';
import {
  ApiEnvelopeOkResponse,
} from '../../../common/decorators/api-envelope.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import {
  ROLES_PERMISSIONS,
  USERS_PERMISSIONS,
} from '../../../common/constants/permissions';
import { PaginationDto } from '../../../common/dto/paginated.dto';
import { CurrentSupabaseAuth } from '../../auth/decorators/current-supabase-auth.decorator';
import { SupabaseAuthGuard } from '../../auth/guards/supabase-auth.guard';
import type { SupabaseAuthContext } from '../../auth/types/authenticated-request.type';
import { RoleEntity } from '../../roles/entities/role.entity';
import { PermissionsGuard } from '../../roles/guards/permissions.guard';
import { UserEntity } from '../entities/user.entity';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(SupabaseAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission(USERS_PERMISSIONS.READ)
  @ApiEnvelopeOkResponse(UserEntity, {
    description: 'List of users',
    isArray: true,
  })
  async findAll(
    @Query() query?: PaginationDto,
  ): Promise<ApiResponse<UserEntity[]>> {
    const { data, meta } = await this.usersService.findAll(query);
    return paginatedResponse(data, meta, 'Users retrieved successfully', 200);
  }

  @Get(':id')
  @RequirePermission(USERS_PERMISSIONS.READ)
  @ApiEnvelopeOkResponse(UserEntity, { description: 'User found' })
  findById(
    @Param('id', new ParseUUIDPipe())
    id: string,
  ): Promise<ApiResponse<UserEntity>> {
    return this.usersService
      .findById(id)
      .then((user) => apiResponse(user, 'User retrieved successfully'));
  }

  @Post()
  @RequirePermission(USERS_PERMISSIONS.CREATE)
  @ApiEnvelopeOkResponse(UserEntity, { description: 'User created' })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<ApiResponse<UserEntity>> {
    const user = await this.usersService.create(createUserDto);
    return apiResponse(user, 'User created successfully');
  }

  @Put(':id')
  @RequirePermission(USERS_PERMISSIONS.UPDATE)
  @ApiEnvelopeOkResponse(UserEntity, { description: 'User updated' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<UserEntity>> {
    const user = await this.usersService.update(id, updateUserDto);
    return apiResponse(user, 'User updated successfully');
  }

  @Delete(':id')
  @RequirePermission(USERS_PERMISSIONS.DELETE)
  @ApiOkResponse({
    description: 'User deleted',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'User deleted successfully' },
        data: { type: 'null' },
        meta: { type: 'null' },
      },
      required: ['status', 'message', 'data', 'meta'],
    },
  })
  async delete(
    @Param('id', new ParseUUIDPipe())
    id: string,
  ): Promise<ApiResponse<null>> {
    await this.usersService.delete(id);
    return apiResponse(null, 'User deleted successfully');
  }

  @Get(':id/role')
  @RequirePermission(ROLES_PERMISSIONS.ASSIGN_USERS)
  @ApiEnvelopeOkResponse(RoleEntity, {
    description: 'Role assigned to the user',
  })
  async getRole(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<RoleEntity>> {
    const role = await this.usersService.getRole(id);
    return apiResponse(role, 'User role retrieved successfully');
  }

  @Put(':id/role')
  @RequirePermission(ROLES_PERMISSIONS.ASSIGN_USERS)
  @ApiEnvelopeOkResponse(UserEntity, { description: 'User with its new role' })
  async assignRole(
    @CurrentSupabaseAuth() auth: SupabaseAuthContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ): Promise<ApiResponse<UserEntity>> {
    const user = await this.usersService.assignRole(
      id,
      updateUserRoleDto.roleId,
      auth.user.id,
    );
    return apiResponse(user, 'User role assigned successfully');
  }
}
