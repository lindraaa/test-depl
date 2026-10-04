import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({
    format: 'uuid',
    example: '6f1c9f0e-2f2f-4a1e-9c3a-0d1a2b3c4d5e',
  })
  @IsUUID()
  roleId: string;
}
