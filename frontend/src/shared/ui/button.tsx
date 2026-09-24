import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';
import { buttonVariants, type ButtonVariantProps } from '@/shared/ui/button-variants';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonVariantProps;

export function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
