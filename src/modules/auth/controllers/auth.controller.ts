import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopeOkResponse } from '../../../common/decorators/api-envelope.decorator';
import { apiResponse } from '../../../common/utils/api-response';
import { ApiResponse } from '../../../shared/interfaces/api-response.interface';
import { CurrentSupabaseAuth } from '../decorators/current-supabase-auth.decorator';
import { GoogleAuthDto } from '../dto/google-auth.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import { SupabaseAuthGuard } from '../guards/supabase-auth.guard';
import { AuthService } from '../services/auth.service';
import type { SupabaseAuthContext } from '../types/authenticated-request.type';
import {
  AuthOAuthUrlType,
  AuthRefreshResultType,
  AuthResultType,
  AuthUserType,
} from '../types/auth-result.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiEnvelopeOkResponse(AuthResultType, {
    description: 'Registration successful',
    status: HttpStatus.CREATED,
  })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<ApiResponse<AuthResultType>> {
    const result = await this.authService.register(dto);

    return apiResponse(result, 'Registration successful', HttpStatus.CREATED);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelopeOkResponse(AuthResultType, { description: 'Login successful' })
  async login(@Body() dto: LoginDto): Promise<ApiResponse<AuthResultType>> {
    const result = await this.authService.login(dto);
    return apiResponse(result, 'Login successful');
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelopeOkResponse(AuthOAuthUrlType, {
    description: 'Google authentication started',
  })
  async google(
    @Body() dto: GoogleAuthDto,
  ): Promise<ApiResponse<AuthOAuthUrlType>> {
    const result = await this.authService.createGoogleAuthUrl(dto.redirectTo);
    return apiResponse(result, 'Google authentication started');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelopeOkResponse(AuthRefreshResultType, {
    description: 'Token refreshed successfully',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<ApiResponse<AuthRefreshResultType>> {
    const result = await this.authService.refresh(dto);
    return apiResponse(result, 'Token refreshed successfully');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Logout successful' },
        data: { type: 'null' },
        meta: { type: 'null' },
      },
      required: ['status', 'message', 'data', 'meta'],
    },
  })
  async logout(
    @CurrentSupabaseAuth() auth: SupabaseAuthContext,
  ): Promise<ApiResponse<null>> {
    await this.authService.logout(auth.accessToken);
    return apiResponse(null, 'Logout successful');
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiEnvelopeOkResponse(AuthUserType, {
    description: 'Authenticated user retrieved successfully',
  })
  async me(
    @CurrentSupabaseAuth() auth: SupabaseAuthContext,
  ): Promise<ApiResponse<AuthUserType>> {
    const user = await this.authService.getOrCreateCurrentUser(auth.user);
    return apiResponse(user, 'Authenticated user retrieved successfully');
  }
}
