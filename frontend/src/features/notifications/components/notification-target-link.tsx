import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { NotificationTarget } from '@/features/notifications/lib/notification-content';

type LinkProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  'aria-describedby'?: string;
};

/** One typed `<Link>` per target so every deep link is checked against the route tree. */
export function NotificationTargetLink({
  target,
  ...props
}: LinkProps & { target: NotificationTarget }) {
  switch (target.kind) {
    case 'client-check-in':
      return (
        <Link to="/client/check-ins/$checkInId" params={{ checkInId: target.checkInId }} {...props} />
      );
    case 'client-training':
      return <Link to="/client/training" {...props} />;
    case 'client-nutrition':
      return <Link to="/client/nutrition" {...props} />;
    case 'trainer-check-in':
      return (
        <Link
          to="/trainer/clients/$clientId/check-ins/$checkInId"
          params={{ clientId: target.clientId, checkInId: target.checkInId }}
          {...props}
        />
      );
    case 'trainer-training-plan':
      return (
        <Link
          to="/trainer/clients/$clientId/training/$planId"
          params={{ clientId: target.clientId, planId: target.planId }}
          {...props}
        />
      );
    case 'trainer-nutrition-plan':
      return (
        <Link
          to="/trainer/clients/$clientId/nutrition/$planId"
          params={{ clientId: target.clientId, planId: target.planId }}
          {...props}
        />
      );
  }
}
