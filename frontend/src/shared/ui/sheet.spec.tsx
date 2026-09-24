import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sheet, SheetContent, SheetTitle } from '@/shared/ui/sheet';

function FileSheet() {
  const [open, setOpen] = useState(true);
  const [name, setName] = useState('');
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom">
        <SheetTitle>Upload</SheetTitle>
        {open ? <p>Sheet open</p> : null}
        <label htmlFor="sheet-file">Photo file</label>
        <input
          id="sheet-file"
          type="file"
          onChange={(event) => setName(event.target.files?.[0]?.name ?? '')}
        />
        {name ? <p>{name}</p> : null}
      </SheetContent>
    </Sheet>
  );
}

describe('Sheet', () => {
  it('does not close after a 0,0 click synthesized by a file picker', () => {
    render(<FileSheet />);
    expect(screen.getByText('Sheet open')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('dialog'), { clientX: 0, clientY: 0 });
    expect(screen.getByText('Sheet open')).toBeInTheDocument();
  });

  it('does not close when Chromium fires cancel for a file picker', () => {
    render(<FileSheet />);
    const dialog = screen.getByRole('dialog');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(screen.getByText('Sheet open')).toBeInTheDocument();
  });
});
