import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');
export type SupabaseClient = ReturnType<typeof createClient>;

export const supabaseProvider = {
  provide: SUPABASE_CLIENT,
  useFactory: (configService: ConfigService): SupabaseClient => {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseAnonKey =
      configService.getOrThrow<string>('SUPABASE_ANON_KEY');

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  },
  inject: [ConfigService],
};
