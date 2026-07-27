import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SUPABASE_URL: z.url().startsWith('https://'),
  SUPABASE_SECRET_KEY: z.string().min(20),
  ALLOWED_ORIGINS: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(15000),
});

const parsed = schema.safeParse({
  ...process.env,
  SUPABASE_SECRET_KEY:
    process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
});
if (!parsed.success) {
  const names = parsed.error.issues.map(issue => issue.path.join('.')).filter(Boolean);
  throw new Error(`Invalid server configuration: ${[...new Set(names)].join(', ')}`);
}

export const config = {
  ...parsed.data,
  allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(',').map(value => value.trim()).filter(Boolean),
};
