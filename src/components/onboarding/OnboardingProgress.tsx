import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
  current: number;
  total: number;
}

export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {/* Progress Dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-2 w-2 rounded-full transition-all duration-200',
              index === current
                ? 'bg-primary w-4'
                : index < current
                ? 'bg-primary/60'
                : 'bg-muted'
            )}
          />
        ))}
      </div>
      
      {/* Numeric Counter */}
      <span className="text-sm text-muted-foreground tabular-nums">
        {current + 1}/{total}
      </span>
    </div>
  );
}
