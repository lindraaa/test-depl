import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleEntity } from '../../roles/entities/role.entity';

@Entity('users')
export class UserEntity {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  @Index('UQ_users_supabase_user_id', { unique: true })
  @Column({ type: 'uuid', nullable: true })
  supabaseUserId: string | null;

  @ApiProperty()
  @Column({ type: 'varchar', unique: true })
  email: string;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', nullable: true })
  firstName: string | null;

  @ApiProperty({ required: false })
  @Column({ type: 'varchar', nullable: true })
  lastName: string | null;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ format: 'uuid' })
  @Index('IDX_users_role_id')
  @Column({ type: 'uuid' })
  roleId: string;

  @ApiProperty({ type: () => RoleEntity })
  @ManyToOne(() => RoleEntity, { nullable: false })
  @JoinColumn({ name: 'roleId' })
  role: RoleEntity;

  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
