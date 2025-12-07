import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[70px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 font-bold ring-offset-background placeholder:text-gray-400 placeholder:font-normal shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25A89B] focus-visible:ring-offset-0 focus-visible:border-[#25A89B] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };

