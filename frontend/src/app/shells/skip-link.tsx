import { useNavigationCopy } from '@/features/navigation/copy';

export function SkipLink() {
  const navigationCopy = useNavigationCopy();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
    >
      {navigationCopy.skipToMain}
    </a>
  );
}
