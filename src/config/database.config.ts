import type { TlsOptions } from 'tls';
import { DataSourceOptions } from 'typeorm';

export const entitiesDir = 'src/modules/**/entities/*.entity.ts';
export const migrationsDir = 'src/migrations/**/*.ts';

export const databaseDefaults = {
  type: 'postgres',
  synchronize: false,
  migrations: [migrationsDir],
} as const satisfies Omit<DataSourceOptions, 'url' | 'entities'>;

function postgresSsl(url: string): boolean | TlsOptions | undefined {
  try {
    const parsed = new URL(url);
    const sslmode = parsed.searchParams.get('sslmode');
    const isSupabase =
      parsed.hostname.includes('supabase.co') ||
      parsed.hostname.includes('supabase.com');

    if (sslmode === 'disable') {
      return false;
    }

    if (sslmode === 'require' || sslmode === 'verify-full' || isSupabase) {
      return { rejectUnauthorized: sslmode === 'verify-full' };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function buildDataSourceOptions(url: string): DataSourceOptions {
  const ssl = postgresSsl(url);

  return {
    ...databaseDefaults,
    url,
    ...(ssl !== undefined ? { ssl } : {}),
  };
}
