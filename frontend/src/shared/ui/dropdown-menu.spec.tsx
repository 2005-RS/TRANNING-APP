import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

function Menu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Options</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioItem checked onSelect={() => {}}>
          Dark
        </DropdownMenuRadioItem>
        <DropdownMenuItem disabled>Unavailable</DropdownMenuItem>
        <DropdownMenuItem>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  it('moves focus into the menu and cycles enabled items with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Menu />);

    await user.click(screen.getByRole('button', { name: 'Options' }));
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveFocus();

    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus();

    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitemradio', { name: 'Dark' })).toHaveFocus();
  });

  it('opens with ArrowDown and returns focus to the trigger on Escape', async () => {
    const user = userEvent.setup();
    render(<Menu />);
    const trigger = screen.getByRole('button', { name: 'Options' });

    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
