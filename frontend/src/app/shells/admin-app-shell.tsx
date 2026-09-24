import type { ReactNode } from 'react';
import { ProductivityShell } from '@/app/shells/productivity-shell';
import { useNavigationCopy } from '@/features/navigation/copy';
import { getAdminNav } from '@/features/navigation/nav-config';

export function AdminAppShell({ children }: { children: ReactNode }) {
  const navigationCopy = useNavigationCopy();
  return (
    <ProductivityShell roleLabel={navigationCopy.roles.ADMIN} items={getAdminNav()}>
      {children}
    </ProductivityShell>
  );
}
