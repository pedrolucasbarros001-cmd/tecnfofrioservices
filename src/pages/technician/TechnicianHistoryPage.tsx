import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search, ChevronRight, Wrench, Settings, Truck, Shield, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { TechnicianServiceSheet } from '@/components/technician/TechnicianServiceSheet';
import type { Service } from '@/types/database';

export default function TechnicianHistoryPage() {
    const { profile } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [showDetailSheet, setShowDetailSheet] = useState(false);

    // Fetch technician's complete history
    const { data: services = [], isLoading } = useQuery({
        queryKey: ['technician-history', profile?.id],
        queryFn: async () => {
            if (!profile) return [];

            const { data: tech, error: techError } = await supabase
                .from('technicians')
                .select('id')
                .eq('profile_id', profile.id)
                .maybeSingle();

            if (techError || !tech) return [];

            const { data, error } = await supabase
                .from('services')
                .select('*, customer:customers(*)')
                .eq('technician_id', tech.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data as Service[]) || [];
        },
        enabled: !!profile,
    });

    const filteredServices = useMemo(() => {
        if (!searchTerm) return services;
        const lowerSearch = searchTerm.toLowerCase();
        return services.filter(s =>
            s.code?.toLowerCase().includes(lowerSearch) ||
            s.customer?.name?.toLowerCase().includes(lowerSearch) ||
            s.appliance_type?.toLowerCase().includes(lowerSearch)
        );
    }, [services, searchTerm]);

    const handleViewDetail = (service: Service) => {
        setSelectedService(service);
        setShowDetailSheet(true);
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            por_fazer: { label: 'Pendente', className: 'bg-slate-100 text-slate-700' },
            em_execucao: { label: 'Em Execução', className: 'bg-blue-100 text-blue-700' },
            na_oficina: { label: 'Oficina', className: 'bg-orange-100 text-orange-700' },
            para_pedir_peca: { label: 'Pedir Peça', className: 'bg-amber-100 text-amber-700' },
            em_espera_de_peca: { label: 'Espera Peça', className: 'bg-purple-100 text-purple-700' },
            a_precificar: { label: 'Orçamentar', className: 'bg-cyan-100 text-cyan-700' },
            concluidos: { label: 'Concluído', className: 'bg-emerald-100 text-emerald-700' },
            em_debito: { label: 'Em Débito', className: 'bg-red-100 text-red-700' },
            finalizado: { label: 'Finalizado', className: 'bg-gray-100 text-gray-700' },
        };
        const info = statusMap[status] || { label: status, className: 'bg-muted text-muted-foreground' };
        return <Badge className={cn('text-[10px] px-1.5 py-0', info.className)}>{info.label}</Badge>;
    };

    return (
        <div className="p-4 md:p-6 space-y-6 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <History className="h-6 w-6 text-primary" />
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">Meu Histórico</h1>
                </div>
                <Badge variant="outline" className="hidden sm:flex">
                    {services.length} Serviços no total
                </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
                Clique num serviço para ver detalhes, fotos e adicionar observações ao histórico.
            </p>

            {/* Search and Filter */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Pesquisar por código, cliente ou aparelho..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11"
                />
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    A carregar histórico...
                </div>
            ) : filteredServices.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                    <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="font-medium text-muted-foreground">Nenhum serviço encontrado</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Tente ajustar a sua pesquisa.
                    </p>
                </div>
            ) : (
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {filteredServices.map((service) => (
                        <Card
                            key={service.id}
                            className="hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99] transition-transform"
                            onClick={() => handleViewDetail(service)}
                        >
                            <CardContent className="p-4">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-primary text-sm">{service.code}</span>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                                            </div>
                                            <h3 className="font-bold text-base mt-0.5">{service.customer?.name || 'Cliente'}</h3>
                                        </div>
                                        {getStatusBadge(service.status || 'por_fazer')}
                                    </div>

                                    {/* Service type + tags */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 h-5', {
                                            'bg-blue-100 text-blue-700': service.service_type === 'reparacao',
                                            'bg-yellow-100 text-yellow-700': service.service_type === 'instalacao',
                                            'bg-green-100 text-green-700': service.service_type === 'entrega',
                                            'bg-slate-100 text-slate-700': service.service_type === 'manutencao',
                                        })}>
                                            {service.service_type === 'reparacao' ? 'Reparação' :
                                             service.service_type === 'instalacao' ? 'Instalação' :
                                             service.service_type === 'entrega' ? 'Entrega' : 'Manutenção'}
                                        </Badge>
                                        {service.is_urgent && (
                                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                                                Urgente
                                            </Badge>
                                        )}
                                        {service.is_warranty && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-green-500 text-green-700">
                                                Garantia
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-muted/30 p-2 rounded-md">
                                        <div className="text-muted-foreground truncate">
                                            {service.appliance_type} {service.brand}
                                        </div>
                                        <div className="text-right text-muted-foreground">
                                            {service.created_at ? format(parseISO(service.created_at), "dd/MM/yyyy", { locale: pt }) : '-'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Simplified service view for technicians */}
            {selectedService && (
                <TechnicianServiceSheet
                    service={selectedService}
                    open={showDetailSheet}
                    onOpenChange={setShowDetailSheet}
                />
            )}
        </div>
    );
}
