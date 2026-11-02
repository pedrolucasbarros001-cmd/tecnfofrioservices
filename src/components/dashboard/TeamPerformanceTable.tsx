import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import type { TeamMember } from '@/hooks/useDashboardMetrics';

interface TeamPerformanceTableProps {
  data: TeamMember[];
  loading?: boolean;
}

export function TeamPerformanceTable({ data, loading }: TeamPerformanceTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Desempenho da equipa — últimos 30 dias
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-5 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            Nenhum técnico registado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Técnico</TableHead>
                  <TableHead className="text-right">Concluídos</TableHead>
                  <TableHead className="text-right">Em curso</TableHead>
                  <TableHead className="text-right pr-5">Receita gerada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((member) => (
                  <TableRow key={member.technician_name}>
                    <TableCell className="font-medium pl-5">
                      {member.technician_name}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {member.completed}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {member.in_progress}
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      {Number(member.revenue_generated).toLocaleString('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
