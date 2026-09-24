import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { AppPath } from '@/features/navigation/route-meta';

export function NavLink({
  to,
  children,
  className,
  onClick,
  'aria-current': ariaCurrent,
}: {
  to: AppPath;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  'aria-current'?: 'page';
}) {
  return (
    <Link
      to={to}
      preload="intent"
      className={className}
      onClick={onClick}
      aria-current={ariaCurrent}
    >
      {children}
    </Link>
  );
}
