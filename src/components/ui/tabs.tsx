import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex gap-2', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Tabs.displayName = 'Tabs';

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('inline-flex items-center gap-0', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsList.displayName = 'TabsList';

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  isActive?: boolean;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, isActive, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all cursor-pointer',
          'focus-visible:outline-none',
          'disabled:pointer-events-none disabled:opacity-50',
          isActive
            ? 'bg-vest-rust text-white font-medium rounded-t-lg shadow-sm'
            : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-normal',
          className
        )}
        {...props}
      >
        {isActive && (
          <svg
            className="h-4 w-4 text-white flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        <span>{children}</span>
      </button>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

export { Tabs, TabsList, TabsTrigger };

