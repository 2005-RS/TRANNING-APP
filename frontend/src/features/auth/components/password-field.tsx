import { useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useAuthCopy } from '@/features/auth/copy';
import { Label } from '@/shared/ui/label';

type PasswordFieldProps = {
  id: string;
  name: string;
  value: string;
  invalid: boolean;
  describedBy?: string;
  disabled?: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
  error?: ReactNode;
};

export function PasswordField({
  id,
  name,
  value,
  invalid,
  describedBy,
  disabled,
  onBlur,
  onChange,
  error,
}: PasswordFieldProps) {
  const authCopy = useAuthCopy();
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible
    ? authCopy.login.hidePassword
    : authCopy.login.showPassword;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{authCopy.login.passwordLabel}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          value={value}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 min-h-12 pr-12"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 size-10 min-h-10 -translate-y-1/2"
          aria-label={toggleLabel}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </Button>
      </div>
      {error}
    </div>
  );
}
