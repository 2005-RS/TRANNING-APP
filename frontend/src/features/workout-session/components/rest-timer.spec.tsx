import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RestTimer } from '@/features/workout-session/components/rest-timer';
import { workoutCopy } from '@/features/workout-session/copy';

describe('RestTimer', () => {
  it('exposes rest remaining through text and the timer, not motion alone', () => {
    render(<RestTimer remainingSeconds={90} complete={false} onSkip={() => undefined} />);
    expect(screen.getByText(workoutCopy.focus.restRemaining)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveAccessibleName(
      `${workoutCopy.focus.restRemaining} 1:30`,
    );
  });

  it('marks rest complete with copy and icon, then continues from the button', async () => {
    const onSkip = vi.fn();
    const user = userEvent.setup();
    render(<RestTimer remainingSeconds={0} complete onSkip={onSkip} />);
    expect(screen.getByText(workoutCopy.focus.restDone)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveAccessibleName(workoutCopy.focus.restDone);
    await user.click(screen.getByRole('button', { name: workoutCopy.focus.continueAfterRest }));
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
