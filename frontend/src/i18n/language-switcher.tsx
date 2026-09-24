import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useCommonCopy } from '@/i18n/locales/common-live';
import { useLanguage } from '@/i18n/use-language';
import type { AppLanguage } from '@/i18n/constants';
import { cn } from '@/shared/lib/utils';

export function LanguageSwitcher({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { language, setLanguage } = useLanguage();
  const commonCopy = useCommonCopy();
  const code = commonCopy.language.code[language];
  const activeLanguageLabel =
    language === 'en' ? commonCopy.language.english : commonCopy.language.spanish;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${commonCopy.language.label}, ${activeLanguageLabel}`}
        data-testid="language-switcher"
        className={cn(
          'inline-flex size-10 min-h-10 shrink-0 items-center justify-center gap-1 rounded-full text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          !compact && 'w-auto min-w-10 px-2.5',
          className,
        )}
      >
        <Globe className="size-5" aria-hidden="true" />
        {compact ? <span className="sr-only">{code}</span> : <span className="font-mono text-xs">{code}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{commonCopy.language.label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup>
          {(
            [
              ['en', commonCopy.language.english],
              ['es', commonCopy.language.spanish],
            ] as const satisfies ReadonlyArray<readonly [AppLanguage, string]>
          ).map(([value, label]) => (
            <DropdownMenuRadioItem
              key={value}
              checked={language === value}
              onSelect={() => setLanguage(value)}
            >
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageMenuItems() {
  const { language, setLanguage } = useLanguage();
  const commonCopy = useCommonCopy();
  return (
    <>
      <DropdownMenuLabel>{commonCopy.language.label}</DropdownMenuLabel>
      <DropdownMenuRadioGroup>
        {(
          [
            ['en', commonCopy.language.english],
            ['es', commonCopy.language.spanish],
          ] as const satisfies ReadonlyArray<readonly [AppLanguage, string]>
        ).map(([value, label]) => (
          <DropdownMenuRadioItem
            key={value}
            checked={language === value}
            onSelect={() => setLanguage(value)}
          >
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}
