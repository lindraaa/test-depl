import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const ROLE_NAME_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export class CreateRoleDto {
  @ApiProperty({ example: 'veterinarian' })
  @IsString()
  @MaxLength(64)
  @Matches(ROLE_NAME_PATTERN, {
    message:
      'name must be lowercase alphanumeric and may contain single separators (._-)',
  })
  name: string;

  @ApiProperty({ required: false, example: 'Veterinary staff' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
