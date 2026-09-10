import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

// A plain native <select> rather than a custom dropdown: fully accessible and far
// more usable on mobile touch keyboards than a hand-rolled listbox.
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
