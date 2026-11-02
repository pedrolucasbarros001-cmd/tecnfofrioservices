import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_LABELS: Record<string, string> = {
  por_fazer: 'Aberto',
  em_execucao: 'Execução',
  na_oficina: 'Oficina',
  para_pedir_peca: 'Pedir Peça',
  em_espera_de_peca: 'Espera Peça',
  em_transito: 'Trânsito',
  a_precificar: 'Orçamentar',
  em_debito: 'Débito',
};

const STATUS_COLORS: Record<string, string> = {
  por_fazer: 'hsl(var(--primary))',
  em_execucao: 'hsl(142, 71%, 45%)',
  na_oficina: 'hsl(38, 92%, 50%)',
  para_pedir_peca: 'hsl(270, 70%, 60%)',
  em_espera_de_peca: 'hsl(0, 72%, 51%)',
  em_transito: 'hsl(200, 70%, 50%)',
  a_precificar: 'hsl(38, 92%, 50%)',
  em_debito: 'hsl(0, 72%, 51%)',
};

interface ServiceStatusChartProps {
  data: Array<{ status: string; count: number }> | null;
  loading?: boolean;
}

export function ServiceStatusChart({ data, loading }: ServiceStatusChartProps) {
  const chartData = (data ?? []).map((d) => ({
    name: STATUS_LABELS[d.status] ?? d.status,
    count: d.count,
    status: d.status,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Serviços em aberto por estado</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
            Nenhum serviço em aberto
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={176}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 0, right: 16, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={80}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                formatter={(v: number) => [v, 'Serviços']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? 'hsl(var(--primary))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
