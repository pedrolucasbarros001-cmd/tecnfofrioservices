import { cn } from '@/lib/utils';

interface OnboardingProgressProps {
  current: number;
  total: number;
}

export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const useBar = total > 10 || isMobile;
  const percent = Math.round(((current + 1) / total) * 100);

  if (useBar) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
          {current + 1}/{total}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
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
      <span className="text-sm text-muted-foreground tabular-nums">
        {current + 1}/{total}
      </span>
    </div>
  );
}
