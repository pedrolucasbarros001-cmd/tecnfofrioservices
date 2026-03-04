import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
    Wrench,
    Clock,
    AlertCircle,
    RefreshCw,
    User,
    Activity,
    Play,
    Building2,
    Package,
    CheckCircle,
    DollarSign,
    LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import tecnofrioLogoIcon from "@/assets/tecnofrio-logo-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_STATUS_CONFIG } from "@/types/database";
import { usePublicActivityLogs } from "@/hooks/useActivityLogs";
import { cn } from "@/lib/utils";

// Tipo de Serviço para o Monitor
interface TVMonitorService {
    id: string;
    code: string;
    status: string;
    appliance_type: string | null;
    brand: string | null;
    model: string | null;
    fault_description: string | null;
    is_urgent: boolean | null;
    technician_id: string | null;
    created_at: string;
    service_location: string;
    customer_name: string | null;
    tech_id: string | null;
    tech_color: string | null;
    tech_active: boolean | null;
    tech_name: string | null;
}

export default function TVMonitorPage() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut({ scope: 'local' });
        navigate("/login");
    };

    useEffect(() => {
        const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(clockInterval);
    }, []);

    const {
        data: services = [],
        refetch,
        isLoading,
        isError
    } = useQuery({
        queryKey: ["tv-monitor-services"],
        queryFn: async () => {
            const { data, error } = await supabase.
                from("tv_monitor_services").
                select("*").
                order("created_at", { ascending: false });
            if (error) throw error;
            return (data || []) as TVMonitorService[];
        },
        refetchInterval: false // Desativado em favor do Realtime
    });

    // Realtime filtrado: só serviços de oficina
    const queryClient = useQueryClient();
    useEffect(() => {
        const channel = supabase
            .channel('tv-monitor-oficina')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'services',
                filter: 'service_location=eq.oficina'
            }, () => {
                queryClient.invalidateQueries({ queryKey: ['tv-monitor-services'] });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);

    // Atividade: polling leve a cada 60s (sem Realtime)
    const { data: activityLogs = [] } = usePublicActivityLogs(10, 60000);


    // Carousel Logic: Split rows evenly
    const topRowServices = services.filter((_, i) => i % 2 === 0);
    const bottomRowServices = services.filter((_, i) => i % 2 !== 0);

    // Helper to render a service card (OPTIMIZED FOR 24 INCH / 1080p)
    // Changes:
    // - Width reduced to 360px (was 400px)
    // - Height fixed to 280px to prevent overflow/stretching
    // - Padding reduced to p-4
    // - Font sizes tweaked for compactness
    const renderServiceCard = (service: TVMonitorService) => (
        <div
            key={service.id}
            className={cn(
                "rounded-2xl p-4 bg-white shadow-lg flex flex-col justify-between border-l-[6px] w-[360px] h-[280px] shrink-0 transition-all duration-300",
                service.is_urgent ? "border-red-500 bg-red-50/10" : "border-[#2B4F84]/80"
            )}
        >
            <div className="space-y-3">
                {/* Header do Card */}
                <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                        <p className="font-mono text-2xl font-black text-[#2B4F84] tracking-tighter leading-none">
                            {service.code}
                        </p>
                        <div
                            className={cn(
                                "px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide inline-block shadow-sm",
                                SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.color || "bg-slate-200 text-slate-700"
                            )}
                        >
                            {SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.label}
                        </div>
                    </div>
                    {service.is_urgent && (
                        <div className="bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-black shadow-md animate-pulse flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 fill-current" />
                            URGENTE
                        </div>
                    )}
                </div>

                {/* Info do Cliente */}
                <div className="space-y-1">
                    <p className="text-lg font-black text-slate-900 leading-tight uppercase truncate" title={service.customer_name || ""}>
                        {service.customer_name || "CLIENTE"}
                    </p>
                    <div className="flex items-center gap-1.5 text-slate-500">
                        <Building2 className="h-4 w-4" />
                        <p className="text-xs font-bold uppercase tracking-tight truncate">
                            {service.appliance_type || "EQUIPAMENTO"}
                        </p>
                    </div>
                </div>

                {/* Sintoma (Compacto) */}
                {service.fault_description && (
                    <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-100 shadow-inner">
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-0.5 tracking-wider">Sintoma</p>
                        <p className="text-xs text-slate-600 font-medium line-clamp-1 leading-snug italic">
                            "{service.fault_description}"
                        </p>
                    </div>
                )}
            </div>

            {/* Footer do Card - Técnico (Always Visible now due to fixed height) */}
            <div className="mt-2 pt-2 border-t border-slate-100">
                {service.technician_id ? (
                    <div className="flex items-center gap-3 bg-[#2B4F84]/5 p-2 rounded-xl border border-[#2B4F84]/10">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shadow-md shrink-0 border-2 border-white"
                            style={{ backgroundColor: service.tech_color || "#2B4F84" }}
                        >
                            {service.tech_name?.charAt(0)}
                        </div>
                        <div className="space-y-0">
                            <p className="text-[9px] text-blue-400 font-black uppercase tracking-wider">Técnico</p>
                            <p className="text-sm font-black text-[#2B4F84] uppercase tracking-tight truncate">{service.tech_name}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-amber-50 rounded-xl p-2 border border-dashed border-amber-200/50">
                        <User className="h-5 w-5 text-amber-500" />
                        <span className="text-xs font-black text-amber-600 uppercase tracking-tight">Aguardando Técnico</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-screen w-screen bg-[#F8FAFC] text-slate-900 flex flex-col overflow-hidden select-none font-sans antialiased">

            {/* 1. Header - Compact for 24 inch (Height: 12vh max 100px) */}
            <header className="h-[12vh] max-h-[100px] flex items-center justify-between px-6 bg-white shadow-md border-b-4 border-[#2B4F84] z-50 relative shrink-0">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img src={tecnofrioLogoIcon} alt="TECNOFRIO" className="h-12 w-12 object-contain" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-black tracking-tighter leading-none text-[#2B4F84]">
                            TECNO<span className="text-slate-300">FRIO</span>
                        </h1>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Monitor de Fluxo</p>
                    </div>
                </div>

                <div className="text-right space-y-0.5">
                    <p className="text-3xl font-mono font-black text-[#2B4F84] tabular-nums leading-none tracking-tight">
                        {format(currentTime, "HH:mm:ss")}
                    </p>
                    <div className="flex items-center justify-end gap-2 text-slate-500 font-bold">
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                        <p className="text-xs uppercase tracking-tight">
                            {format(currentTime, "EEEE, d 'de' MMMM", { locale: pt })}
                        </p>
                    </div>
                </div>
            </header>

            {/* 2. Content Area - 24 inch optimized rows */}
            <main className="flex-1 flex flex-col overflow-hidden py-3 gap-2 px-4 bg-[#F1F5F9] justify-center">

                {/* Row 1 */}
                <div className="h-[300px] relative overflow-hidden flex items-center shrink-0">
                    <div
                        className={cn(
                            "flex gap-6 h-full py-2 px-4 items-center",
                            topRowServices.length > 3 ? "animate-scroll-slow" : "justify-center w-full"
                        )}
                    >
                        {topRowServices.map(renderServiceCard)}
                        {/* Loop Duplicate */}
                        {topRowServices.length > 3 && topRowServices.map((s) => ({ ...s, id: `${s.id}-dup` })).map(renderServiceCard)}
                    </div>
                </div>

                {/* Row 2 */}
                <div className="h-[300px] relative overflow-hidden flex items-center shrink-0">
                    <div
                        className={cn(
                            "flex gap-6 h-full py-2 px-4 items-center",
                            bottomRowServices.length > 3 ? "animate-scroll-slow-reverse" : "justify-center w-full"
                        )}
                    >
                        {bottomRowServices.map(renderServiceCard)}
                        {/* Loop Duplicate */}
                        {bottomRowServices.length > 3 && bottomRowServices.map((s) => ({ ...s, id: `${s.id}-dup` })).map(renderServiceCard)}
                    </div>
                </div>
            </main>

            {/* 3. Footer - Height 15vh max 120px */}
            <footer className="h-[15vh] max-h-[120px] flex flex-col z-50 shrink-0">
                <div className="flex-1 bg-[#2B4F84] border-t-4 border-yellow-400 p-3 relative overflow-hidden shadow-lg flex items-center">
                    <div className="absolute left-6 flex items-center gap-3 z-20 bg-[#2B4F84] pr-6 py-1">
                        <Activity className="h-5 w-5 text-yellow-400 animate-pulse" />
                        <span className="text-lg text-yellow-400 font-black uppercase tracking-widest hidden lg:inline">
                            Eventos
                        </span>
                    </div>

                    <div className="flex-1 overflow-hidden relative h-full flex items-center">
                        <div className="flex gap-10 animate-marquee whitespace-nowrap items-center w-max pl-40">
                            {activityLogs.length === 0 ? (
                                <span className="text-white/30 text-base font-bold uppercase italic tracking-wider">Aguardando atualizações do sistema...</span>
                            ) : (
                                activityLogs.map((log) => {
                                    const isValidDate = log.created_at && !isNaN(new Date(log.created_at).getTime());
                                    return (
                                        <div
                                            key={log.id}
                                            className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-1.5 backdrop-blur-sm"
                                        >
                                            <span className="text-base text-yellow-300 font-mono font-bold">
                                                [{isValidDate ? format(new Date(log.created_at), "HH:mm") : "--:--"}]
                                            </span>
                                            <span className="text-lg text-white font-bold tracking-tight uppercase">
                                                {log.description}
                                            </span>
                                        </div>
                                    )
                                })
                            )}
                            {/* Duplicate for Marquee Loop */}
                            {activityLogs.length > 0 && activityLogs.map((log) => {
                                const isValidDate = log.created_at && !isNaN(new Date(log.created_at).getTime());
                                return (
                                    <div
                                        key={`${log.id}-dup`}
                                        className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-1.5 backdrop-blur-sm"
                                    >
                                        <span className="text-base text-yellow-300 font-mono font-bold">
                                            [{isValidDate ? format(new Date(log.created_at), "HH:mm") : "--:--"}]
                                        </span>
                                        <span className="text-lg text-white font-bold tracking-tight uppercase">
                                            {log.description}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="h-[35px] bg-white px-6 flex items-center justify-between border-t border-slate-200">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistema V2.2 - 24" Optimized</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">
                            {services.length} <span className="text-slate-400 font-bold">Serviços</span>
                        </p>
                        <button
                            onClick={handleLogout}
                            className="group text-slate-300 hover:text-red-500 transition-colors"
                            title="Sair do Monitor"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </footer>

            <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-slow {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 1.5rem)); }
        }
        @keyframes scroll-slow-reverse {
          0% { transform: translateX(calc(-50% - 1.5rem)); }
          100% { transform: translateX(0); }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
        .animate-scroll-slow {
          animation: scroll-slow 50s linear infinite;
        }
        .animate-scroll-slow-reverse {
          animation: scroll-slow-reverse 55s linear infinite;
        }
        .animate-scroll-slow:hover,
        .animate-scroll-slow-reverse:hover {
          animation-play-state: paused;
        }
      `}</style>
        </div>
    );
}
