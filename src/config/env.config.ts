import { ConfigModule } from '@nestjs/config';

type EnvironmentValueName =
  'SUPABASE_URL' | 'SUPABASE_ANON_KEY' | 'AUTH_GOOGLE_REDIRECT_URLS';

function requireEnvironmentValue(
  config: Record<string, unknown>,
  name: EnvironmentValueName,
): string {
  const value = config[name];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }

  return value.trim();
}

function parseGoogleRedirectUrls(value: string, isProduction: boolean): string {
  const redirectUrls = value.split(',').map((url) => url.trim());

  if (
    redirectUrls.length === 0 ||
    redirectUrls.some((url) => url.length === 0)
  ) {
    throw new Error(
      'AUTH_GOOGLE_REDIRECT_URLS must contain at least one non-empty URL',
    );
  }

  for (const redirectUrl of redirectUrls) {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(redirectUrl);
    } catch {
      throw new Error(
        'AUTH_GOOGLE_REDIRECT_URLS must contain valid HTTP or HTTPS URLs',
      );
    }

    if (
      !['http:', 'https:'].includes(parsedUrl.protocol) ||
      parsedUrl.hostname.length === 0
    ) {
      throw new Error(
        'AUTH_GOOGLE_REDIRECT_URLS must contain valid HTTP or HTTPS URLs',
      );
    }

    if (isProduction && parsedUrl.protocol !== 'https:') {
      throw new Error('AUTH_GOOGLE_REDIRECT_URLS must use HTTPS in production');
    }
  }

  return [...new Set(redirectUrls)].join(',');
}

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const supabaseUrl = requireEnvironmentValue(config, 'SUPABASE_URL');
  const supabaseAnonKey = requireEnvironmentValue(config, 'SUPABASE_ANON_KEY');
  const googleRedirectUrls = requireEnvironmentValue(
    config,
    'AUTH_GOOGLE_REDIRECT_URLS',
  );

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new Error('SUPABASE_URL must be a valid HTTP or HTTPS URL');
  }

  const isProduction =
    typeof config.NODE_ENV === 'string' &&
    config.NODE_ENV.toLowerCase() === 'production';
  const normalizedGoogleRedirectUrls = parseGoogleRedirectUrls(
    googleRedirectUrls,
    isProduction,
  );

  return {
    ...config,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: supabaseAnonKey,
    AUTH_GOOGLE_REDIRECT_URLS: normalizedGoogleRedirectUrls,
  };
}

export const envConfig = ConfigModule.forRoot({
  isGlobal: true,
  validate: validateEnvironment,
});
