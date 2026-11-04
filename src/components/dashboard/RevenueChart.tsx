import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { RevenueTrendItem } from '@/hooks/useDashboardMetrics';

interface RevenueChartProps {
  data: RevenueTrendItem[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
        <p className="font-semibold mb-1">{label}</p>
        <p className="text-muted-foreground">
          Receita:{' '}
          <span className="font-medium text-foreground">
            {Number(payload[0].value).toLocaleString('pt-PT', {
              style: 'currency',
              currency: 'EUR',
            })}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data, loading }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Receita mensal</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-52 w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
            Sem dados de receita registados
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={208}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`
                }
                width={48}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar
                dataKey="revenue"
                radius={[4, 4, 0, 0]}
                fill="hsl(var(--primary))"
                maxBarSize={56}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
