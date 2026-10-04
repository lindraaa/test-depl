import { Global, Module } from '@nestjs/common';
import { supabaseProvider } from '../../config/supabase.provider';
import { UsersModule } from '../users/users.module';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';

@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard, supabaseProvider],
  exports: [AuthService, SupabaseAuthGuard, supabaseProvider],
})
export class AuthModule {}
