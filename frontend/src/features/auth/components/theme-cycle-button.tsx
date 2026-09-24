import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useTheme } from '@/shared/lib/use-theme';
import { useAuthCopy } from '@/features/auth/copy';
import { useNavigationCopy } from '@/features/navigation/copy';
import type { ThemePreference } from '@/shared/lib/theme';

const themeIcons = {
  dark: Moon,
  light: Sun,
  system: Monitor,
} as const;

export function ThemeCycleButton() {
  const authCopy = useAuthCopy();
  const navigationCopy = useNavigationCopy();
  const { preference, setPreference } = useTheme();
  const Icon = themeIcons[preference];
  const themeLabels: Record<ThemePreference, string> = {
    dark: navigationCopy.themeDark,
    light: navigationCopy.themeLight,
    system: navigationCopy.themeSystem,
  };

  function cycleTheme() {
    const order = ['dark', 'light', 'system'] as const;
    const currentIndex = order.indexOf(preference);
    const next = order[(currentIndex + 1) % order.length] ?? 'dark';
    setPreference(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-10 shrink-0 rounded-full"
      onClick={cycleTheme}
      aria-label={`${authCopy.theme.cycle}, ${themeLabels[preference]}`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </Button>
  );
}
