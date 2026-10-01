import { documentTitleFor } from '@/features/navigation/copy';

/** Social preview image served from `public/landing/` (1200 × 630). */
export const PUBLIC_OG_IMAGE = '/landing/og-cover.jpg';

/**
 * Head tags for a public page: title, description and Open Graph / Twitter
 * card. Crawlers that do not run JavaScript read the defaults in index.html.
 */
export function publicPageHead(pageTitle: string, description: string) {
  const title = documentTitleFor(pageTitle);
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: PUBLIC_OG_IMAGE },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
  };
}
