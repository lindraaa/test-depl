import { Module } from '@nestjs/common';
import { envConfig } from './config/env.config';
import { DatabaseModule } from './config/database.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';

@Module({
  imports: [
    envConfig,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
  
  ],
})
export class AppModule {}
