import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PaginationDto } from '../../../common/dto/paginated.dto';
import { ApiMeta } from '../../../shared/interfaces/api-response.interface';
import { RoleEntity } from '../../roles/entities/role.entity';
import { RolesService } from '../../roles/services/roles.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserEntity } from '../entities/user.entity';
import {
  CreateUserProfile,
  UsersRepository,
} from '../repositories/users.repository';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesService: RolesService,
  ) {}

  async findAll(
    query: PaginationDto = new PaginationDto(),
  ): Promise<{ data: UserEntity[]; meta: ApiMeta }> {
    const [data, total] =
      await this.usersRepository.findAllPaginatedWithRole(query);

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

  async findById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id "${id}" was not found`);
    }
    return user;
  }

  findBySupabaseUserId(supabaseUserId: string): Promise<UserEntity | null> {
    return this.usersRepository.findBySupabaseUserId(supabaseUserId);
  }

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const roleId = await this.rolesService.getDefaultRoleId();

    return this.usersRepository.create({
      ...createUserDto,
      supabaseUserId: null,
      roleId,
    });
  }

  async createProfile(
    profile: Omit<CreateUserProfile, 'roleId'>,
  ): Promise<UserEntity> {
    const roleId = await this.rolesService.getDefaultRoleId();

    return this.usersRepository.createProfile({ ...profile, roleId });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.usersRepository.update(id, updateUserDto);
    if (!user) {
      throw new NotFoundException(`User with id "${id}" was not found`);
    }
    return user;
  }

  async delete(id: string): Promise<void> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with id "${id}" was not found`);
    }
    await this.usersRepository.delete(id);
  }

  async getRole(id: string): Promise<RoleEntity> {
    const user = await this.findById(id);
    return user.role;
  }

  async assignRole(
    userId: string,
    roleId: string,
    actorSupabaseUserId?: string,
  ): Promise<UserEntity> {
    if (actorSupabaseUserId) {
      const actor =
        await this.usersRepository.findBySupabaseUserId(actorSupabaseUserId);

      if (actor && actor.id === userId) {
        throw new ForbiddenException(
          'You cannot change the role of your own account',
        );
      }
    }

    const [user, role] = await Promise.all([
      this.findById(userId),
      this.rolesService.findById(roleId),
    ]);

    const updated = await this.usersRepository.assignRole(user.id, role.id);

    if (!updated) {
      throw new NotFoundException(`User with id "${userId}" was not found`);
    }

    this.logger.log(
      `User "${user.id}" role changed from "${user.role?.name ?? 'unknown'}" to "${role.name}"`,
    );

    return updated;
  }
}
