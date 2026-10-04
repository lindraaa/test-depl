import { ApiProperty } from '@nestjs/swagger';
import { AuthSessionType } from './auth-session.type';

export class AuthUserType {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  supabaseUserId: string;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty({ type: String, nullable: true })
  firstName: string | null;

  @ApiProperty({ type: String, nullable: true })
  lastName: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ format: 'uuid' })
  roleId: string;

  @ApiProperty({ example: 'user' })
  role: string;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class AuthResultType {
  @ApiProperty({ type: AuthUserType })
  user: AuthUserType;

  @ApiProperty({ type: AuthSessionType })
  session: AuthSessionType;
}

export class AuthRefreshResultType {
  @ApiProperty({ type: AuthSessionType })
  session: AuthSessionType;
}

export class AuthOAuthUrlType {
  @ApiProperty({ format: 'uri' })
  url: string;
}

export class AuthPendingConfirmationType {
  @ApiProperty({ type: AuthUserType })
  user: AuthUserType;

  @ApiProperty({ type: AuthSessionType, nullable: true })
  session: null;

  @ApiProperty({ example: true })
  requiresEmailConfirmation: true;
}

export type AuthRegistrationResult =
  AuthResultType | AuthPendingConfirmationType;
