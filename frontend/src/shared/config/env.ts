import { z } from 'zod';
import { setApiOrigin } from '../lib/api-origin';

const publicEnvSchema = z.object({
  VITE_API_URL: z
    .string()
    .min(1, 'VITE_API_URL is required')
    .url('VITE_API_URL must be an absolute http(s) origin')
    .refine((value) => !value.endsWith('/'), {
      message: 'VITE_API_URL must not end with a slash',
    }),
  VITE_APP_ENV: z.enum(['development', 'test', 'production']).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function readPublicEnv(
  source: Record<string, string | undefined>,
): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    VITE_API_URL: source.VITE_API_URL,
    VITE_APP_ENV: source.VITE_APP_ENV || undefined,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid public frontend environment: ${details}`);
  }

  return parsed.data;
}

let cached: PublicEnv | undefined;

export function getPublicEnv(): PublicEnv {
  if (!cached) {
    cached = readPublicEnv({
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
    });
    setApiOrigin(cached.VITE_API_URL);
  }
  return cached;
}

export function resetPublicEnvCache(): void {
  cached = undefined;
}
