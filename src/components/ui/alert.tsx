import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full rounded-lg border p-4',
          {
            'border-red-200 bg-red-50 text-red-900': variant === 'destructive',
            'border-slate-200 bg-slate-50 text-slate-900': variant === 'default',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Alert.displayName = 'Alert';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return <p ref={ref} className={cn('text-sm', className)} {...props} />;
  }
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription };

