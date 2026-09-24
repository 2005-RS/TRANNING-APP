import type { ReactNode } from 'react';
import { ProductivityShell } from '@/app/shells/productivity-shell';
import { useNavigationCopy } from '@/features/navigation/copy';
import { getTrainerNav } from '@/features/navigation/nav-config';

export function TrainerAppShell({ children }: { children: ReactNode }) {
  const navigationCopy = useNavigationCopy();
  return (
    <ProductivityShell roleLabel={navigationCopy.roles.TRAINER} items={getTrainerNav()}>
      {children}
    </ProductivityShell>
  );
}
