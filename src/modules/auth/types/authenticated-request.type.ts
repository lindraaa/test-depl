import type { User } from '@supabase/supabase-js';
import type { Request } from 'express';

export interface SupabaseAuthContext {
  accessToken: string;
  user: User;
}

export interface AuthenticatedSupabaseRequest extends Request {
  supabaseAuth?: SupabaseAuthContext;
}
