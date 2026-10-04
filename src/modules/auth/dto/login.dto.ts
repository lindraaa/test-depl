import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@example.com', format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'strong-password',
    format: 'password',
    writeOnly: true,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
