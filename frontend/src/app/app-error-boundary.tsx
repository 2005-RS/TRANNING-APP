import { Component, type ReactNode } from 'react';
import { navigationCopy } from '@/features/navigation/copy';
import { logDevError } from '@/shared/lib/safe-log';

type State = { failed: boolean };

/**
 * Last line of defense above the providers and the router. Route errors are
 * handled by `RouteErrorPage`; this catches what happens outside any route
 * (a provider or the shell failing to render), which otherwise leaves a blank page.
 *
 * React only supports error boundaries as class components. The fallback uses
 * plain markup because the providers it would need may be what failed.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    logDevError(error);
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <main
        id="main-content"
        className="flex min-h-svh items-center bg-background px-6 py-16 text-foreground"
      >
        <div role="alert" className="mx-auto max-w-md space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">{navigationCopy.routeErrorTitle}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{navigationCopy.routeErrorBody}</p>
          <button
            type="button"
            className="inline-flex min-h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={() => window.location.reload()}
          >
            {navigationCopy.reload}
          </button>
        </div>
      </main>
    );
  }
}
