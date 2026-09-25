export const PUBLIC_SITE_PATHS = ['/', '/platform', '/training', '/progress', '/about'] as const;

export type PublicSitePath = (typeof PUBLIC_SITE_PATHS)[number];

/** Marketing pages render without waiting for session restore; they never read private data. */
export function isPublicSitePath(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return (PUBLIC_SITE_PATHS as readonly string[]).includes(normalized);
}
