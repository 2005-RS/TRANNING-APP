import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import type { TrainingTab } from '@/features/workout-session/lib/training-search';
import { workoutCopy } from '@/features/workout-session/copy';

export type { TrainingTab } from '@/features/workout-session/lib/training-search';

type TrainingTabsProps = {
  current: TrainingTab;
  children: ReactNode;
};

const TAB_ORDER: TrainingTab[] = ['plan', 'library', 'history'];

export function TrainingTabs({ current, children }: TrainingTabsProps) {
  return (
    <>
      <div role="tablist" aria-label={workoutCopy.hub.tabsLabel} className="flex gap-1 border-b">
        {TAB_ORDER.map((value) => ({ value, label: workoutCopy.hub.tabs[value] })).map((tab) => (
          <Link
            key={tab.value}
            to="/client/training"
            search={{ tab: tab.value }}
            role="tab"
            aria-selected={current === tab.value}
            className={
              'min-h-11 px-3 text-sm font-medium focus-visible:outline-none ' +
              (current === tab.value
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground')
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </>
  );
}
