import { ApiProperty } from '@nestjs/swagger';

export class AuthSessionType {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: Number, nullable: true })
  expiresAt: number | null;

  @ApiProperty({ type: Number, nullable: true })
  expiresIn: number | null;

  @ApiProperty({ example: 'bearer' })
  tokenType: string;
}
