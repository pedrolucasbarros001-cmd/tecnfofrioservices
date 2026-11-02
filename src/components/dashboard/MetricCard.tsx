import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number; // percentage change
    label?: string;
  };
  alert?: boolean; // highlight if value > 0 (e.g. unbilled)
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  alert,
  loading,
  className,
}: MetricCardProps) {
  const isPositiveTrend = trend && trend.value > 0;
  const isNegativeTrend = trend && trend.value < 0;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {Icon && (
                <div className="rounded-md bg-muted p-1.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex items-end gap-2">
              <p
                className={cn(
                  'text-3xl font-bold tracking-tight',
                  alert && Number(value) > 0 && 'text-amber-500 dark:text-amber-400',
                )}
              >
                {value}
              </p>
            </div>

            <div className="mt-2 flex items-center gap-1.5">
              {trend && (
                <>
                  {isPositiveTrend && (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  {isNegativeTrend && (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  )}
                  {!isPositiveTrend && !isNegativeTrend && (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isPositiveTrend && 'text-emerald-500',
                      isNegativeTrend && 'text-red-500',
                      !isPositiveTrend && !isNegativeTrend && 'text-muted-foreground',
                    )}
                  >
                    {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
                  </span>
                  {trend.label && (
                    <span className="text-xs text-muted-foreground">{trend.label}</span>
                  )}
                </>
              )}
              {subtitle && !trend && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
