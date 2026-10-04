import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    example: 'http://localhost:5173/auth/callback',
    format: 'uri',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  redirectTo: string;
}
