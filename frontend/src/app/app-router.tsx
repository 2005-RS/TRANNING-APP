import { RouterProvider } from '@tanstack/react-router';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { router as defaultRouter, createAppRouter } from '@/app/router';

export function AppRouterProvider({
  router = defaultRouter,
}: {
  router?: ReturnType<typeof createAppRouter>;
}) {
  const auth = useAuthSession();
  return <RouterProvider router={router} context={{ auth }} />;
}
