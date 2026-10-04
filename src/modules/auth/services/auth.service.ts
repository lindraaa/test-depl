import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Session, User } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../config/supabase.provider';
import type { SupabaseClient } from '../../../config/supabase.provider';
import { UserEntity } from '../../users/entities/user.entity';
import { UsersService } from '../../users/services/users.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import {
  AuthOAuthUrlType,
  AuthRefreshResultType,
  AuthRegistrationResult,
  AuthResultType,
  AuthUserType,
} from '../types/auth-result.type';
import { AuthSessionType } from '../types/auth-session.type';

type AuthOperation = 'register' | 'login' | 'refresh' | 'logout' | 'google';

function errorProperty(
  error: unknown,
  property: 'code' | 'name' | 'status',
): string | number | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[property];
  return typeof value === 'string' || typeof value === 'number'
    ? value
    : undefined;
}

function isSupabaseUnavailable(error: unknown): boolean {
  const status = errorProperty(error, 'status');
  const name = errorProperty(error, 'name');

  return (
    status === 0 ||
    status === 429 ||
    (typeof status === 'number' && status >= 500) ||
    (typeof name === 'string' && name.toLowerCase().includes('retryable'))
  );
}

function isDuplicateRegistration(error: unknown): boolean {
  const status = errorProperty(error, 'status');
  const code = errorProperty(error, 'code');

  return (
    status === 409 ||
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    code === 'email_address_exists'
  );
}

function isUniqueConstraintViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    driverError?: { code?: unknown };
  };

  return candidate.code === '23505' || candidate.driverError?.code === '23505';
}

function userMetadata(user: User): Record<string, unknown> {
  return user.user_metadata ?? {};
}

function metadataString(user: User, keys: string[]): string | null {
  const metadata = userMetadata(user);

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function isGoogleUser(user: User): boolean {
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;

  return (
    appMetadata.provider === 'google' ||
    user.identities?.some((identity) => identity.provider === 'google') === true
  );
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabaseClient: SupabaseClient,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthRegistrationResult> {
    const { data, error } = await this.runSupabaseRequest(
      () =>
        this.supabaseClient.auth.signUp({
          email: dto.email,
          password: dto.password,
        }),
      'register',
    );

    if (error) {
      this.throwSupabaseError(error, 'register');
    }

    const supabaseUser = data.user;
    if (!supabaseUser) {
      throw new ServiceUnavailableException(
        'Supabase did not return a registered user',
      );
    }

    const user = await this.createLocalProfile(dto, supabaseUser);
    const session = data.session ? this.normalizeSession(data.session) : null;

    if (!session) {
      return {
        user,
        session: null,
        requiresEmailConfirmation: true,
      };
    }

    return { user, session };
  }

  async login(dto: LoginDto): Promise<AuthResultType> {
    const { data, error } = await this.runSupabaseRequest(
      () =>
        this.supabaseClient.auth.signInWithPassword({
          email: dto.email,
          password: dto.password,
        }),
      'login',
    );

    if (error) {
      this.throwSupabaseError(error, 'login');
    }

    if (!data.user) {
      throw new InternalServerErrorException(
        'Supabase did not return an authenticated user',
      );
    }

    if (!data.session) {
      throw new InternalServerErrorException(
        'Supabase did not return an authenticated session',
      );
    }

    const user = await this.resolveLocalProfile(data.user.id);

    return {
      user,
      session: this.normalizeSession(data.session),
    };
  }

  async createGoogleAuthUrl(redirectTo: string): Promise<AuthOAuthUrlType> {
    const allowedRedirectTo = this.getAllowedRedirectUrl(redirectTo);
    const { data, error } = await this.runSupabaseRequest(
      () =>
        this.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: allowedRedirectTo },
        }),
      'google',
    );

    if (error) {
      this.throwSupabaseError(error, 'google');
    }

    if (!data || typeof data.url !== 'string' || data.url.trim().length === 0) {
      throw new InternalServerErrorException(
        'Supabase did not return an OAuth authorization URL',
      );
    }

    return { url: data.url };
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthRefreshResultType> {
    const { data, error } = await this.runSupabaseRequest(
      () =>
        this.supabaseClient.auth.refreshSession({
          refresh_token: dto.refreshToken,
        }),
      'refresh',
    );

    if (error) {
      this.throwSupabaseError(error, 'refresh');
    }

    if (!data.session) {
      throw new InternalServerErrorException(
        'Supabase did not return a refreshed session',
      );
    }

    return {
      session: this.normalizeSession(data.session),
    };
  }

  async logout(accessToken: string): Promise<void> {
    const { error } = await this.runSupabaseRequest(
      () => this.supabaseClient.auth.admin.signOut(accessToken, 'local'),
      'logout',
    );

    if (!error) {
      return;
    }

    const status = errorProperty(error, 'status');
    if (status === 401 || status === 403 || status === 404) {
      return;
    }

    this.throwSupabaseError(error, 'logout');
  }

  async getCurrentUser(supabaseUserId: string): Promise<AuthUserType> {
    return this.resolveLocalProfile(supabaseUserId);
  }

  async getOrCreateCurrentUser(supabaseUser: User): Promise<AuthUserType> {
    const profile = await this.findLocalProfile(supabaseUser.id);

    if (profile) {
      return this.toAuthUser(profile);
    }

    if (!isGoogleUser(supabaseUser)) {
      throw new InternalServerErrorException(
        'Authenticated user profile is not available',
      );
    }

    return this.provisionGoogleProfile(supabaseUser);
  }

  private getAllowedRedirectUrl(redirectTo: string): string {
    const normalizedRedirectTo =
      typeof redirectTo === 'string' ? redirectTo.trim() : '';

    if (normalizedRedirectTo.length === 0) {
      throw new BadRequestException('redirectTo is required');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedRedirectTo);
    } catch {
      throw new BadRequestException(
        'redirectTo must be a valid HTTP or HTTPS URL',
      );
    }

    if (
      !['http:', 'https:'].includes(parsedUrl.protocol) ||
      parsedUrl.hostname.length === 0
    ) {
      throw new BadRequestException(
        'redirectTo must be a valid HTTP or HTTPS URL',
      );
    }

    const configuredRedirectUrls = this.configService
      .getOrThrow<string>('AUTH_GOOGLE_REDIRECT_URLS')
      .split(',')
      .map((url) => url.trim());

    if (!configuredRedirectUrls.includes(normalizedRedirectTo)) {
      throw new BadRequestException('redirectTo is not allowed');
    }

    return normalizedRedirectTo;
  }

  private async findLocalProfile(
    supabaseUserId: string,
  ): Promise<UserEntity | null> {
    try {
      return await this.usersService.findBySupabaseUserId(supabaseUserId);
    } catch {
      throw new InternalServerErrorException(
        'Unable to retrieve the local user profile',
      );
    }
  }

  private async provisionGoogleProfile(
    supabaseUser: User,
  ): Promise<AuthUserType> {
    const { email, firstName, lastName } =
      this.toGoogleProfileData(supabaseUser);

    try {
      const profile = await this.usersService.createProfile({
        supabaseUserId: supabaseUser.id,
        email,
        firstName,
        lastName,
      });

      return this.toAuthUser(profile);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        const concurrentProfile = await this.findLocalProfile(supabaseUser.id);
        if (concurrentProfile) {
          return this.toAuthUser(concurrentProfile);
        }

        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      throw new InternalServerErrorException(
        'Unable to create the local user profile',
      );
    }
  }

  private toGoogleProfileData(supabaseUser: User): {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } {
    const email = supabaseUser.email?.trim();
    if (!email) {
      throw new InternalServerErrorException(
        'Authenticated user profile is not available',
      );
    }

    let firstName = metadataString(supabaseUser, ['first_name', 'given_name']);
    let lastName = metadataString(supabaseUser, ['last_name', 'family_name']);
    const fullName = metadataString(supabaseUser, ['full_name', 'name']);
    const fullNameParts = fullName?.split(/\s+/) ?? [];

    if (!firstName && fullNameParts[0]) {
      firstName = fullNameParts[0];
    }

    if (!lastName && fullNameParts.length > 1) {
      lastName = fullNameParts.slice(1).join(' ');
    }

    return { email, firstName: firstName ?? null, lastName: lastName ?? null };
  }

  private async createLocalProfile(
    dto: RegisterDto,
    supabaseUser: User,
  ): Promise<AuthUserType> {
    try {
      const profile = await this.usersService.createProfile({
        supabaseUserId: supabaseUser.id,
        email: supabaseUser.email ?? dto.email,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
      });

      return this.toAuthUser(profile);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw new InternalServerErrorException(
        'Unable to create the local user profile',
      );
    }
  }

  private async resolveLocalProfile(
    supabaseUserId: string,
  ): Promise<AuthUserType> {
    const profile = await this.findLocalProfile(supabaseUserId);

    if (!profile) {
      throw new InternalServerErrorException(
        'Authenticated user profile is not available',
      );
    }

    return this.toAuthUser(profile);
  }

  private toAuthUser(profile: UserEntity): AuthUserType {
    if (!profile.supabaseUserId) {
      throw new InternalServerErrorException(
        'Authenticated user profile is not available',
      );
    }

    return {
      id: profile.id,
      supabaseUserId: profile.supabaseUserId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      isActive: profile.isActive,
      roleId: profile.roleId,
      role: profile.role?.name ?? '',
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private normalizeSession(session: Session): AuthSessionType {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? null,
      expiresIn: session.expires_in ?? null,
      tokenType: session.token_type || 'bearer',
    };
  }

  private async runSupabaseRequest<T>(
    request: () => Promise<T>,
    operation: AuthOperation,
  ): Promise<T> {
    try {
      return await request();
    } catch (error) {
      this.throwSupabaseError(error, operation);
    }
  }

  private throwSupabaseError(error: unknown, operation: AuthOperation): never {
    if (isSupabaseUnavailable(error)) {
      throw new ServiceUnavailableException(
        'Supabase authentication service is unavailable',
      );
    }

    const status = errorProperty(error, 'status');
    const code = errorProperty(error, 'code');

    if (operation === 'register') {
      if (isDuplicateRegistration(error)) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      if (status === 400 || status === 422) {
        throw new BadRequestException('Registration request was rejected');
      }
    }

    if (operation === 'login') {
      if (
        code === 'invalid_credentials' ||
        status === 400 ||
        status === 401 ||
        status === 403
      ) {
        throw new UnauthorizedException('Invalid email or password');
      }
    }

    if (operation === 'refresh') {
      if (
        (typeof code === 'string' && code.includes('refresh_token')) ||
        status === 400 ||
        status === 401 ||
        status === 403
      ) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
    }

    if (operation === 'logout' && (status === 400 || status === 422)) {
      throw new BadRequestException('Logout request was rejected');
    }

    throw new InternalServerErrorException(
      'Supabase authentication request failed',
    );
  }
}
