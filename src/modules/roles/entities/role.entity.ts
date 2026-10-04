import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PermissionEntity } from './permission.entity';

@Entity('roles')
export class RoleEntity {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'admin' })
  @Index('UQ_roles_name', { unique: true })
  @Column({ type: 'varchar' })
  name: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isSystemRole: boolean;

  @ApiProperty({ type: () => [PermissionEntity], required: false })
  @ManyToMany(() => PermissionEntity, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId' },
    inverseJoinColumn: { name: 'permissionId' },
  })
  permissions: PermissionEntity[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
