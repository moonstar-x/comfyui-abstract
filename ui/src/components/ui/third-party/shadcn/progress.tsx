'use client';

import { Progress as ProgressPrimitive } from '@base-ui/react/progress';
import { cn } from 'cn';

function Progress({
  className,
  children,
  value,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      className={cn('flex flex-wrap gap-3', className)}
      data-slot="progress"
      value={value}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={cn(
        'relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted',
        className
      )}
      {...props}
    />
  );
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      className={cn('h-full bg-primary transition-all', className)}
      data-slot="progress-indicator"
      {...props}
    />
  );
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn('text-sm font-medium', className)}
      data-slot="progress-label"
      {...props}
    />
  );
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      className={cn(
        'ml-auto text-sm text-muted-foreground tabular-nums',
        className
      )}
      {...props}
    />
  );
}

export {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue
};
