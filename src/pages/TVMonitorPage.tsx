import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
        await supabase.auth.signOut();
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
        refetchInterval: 30000
    });

    const { data: activityLogs = [] } = usePublicActivityLogs(10);

    useEffect(() => {
        const interval = setInterval(() => {
            refetch();
            setLastRefresh(new Date());
        }, 30000);
        return () => clearInterval(interval);
    }, [refetch]);

    // Carousel Logic: Split rows evenly
    const topRowServices = services.filter((_, i) => i % 2 === 0);
    const bottomRowServices = services.filter((_, i) => i % 2 !== 0);

    // Helper to render a service card (OPTIMIZED FOR 24 INCH / 1080p)
    // Scale reduced by ~45% from previous version
    const renderServiceCard = (service: TVMonitorService) => (
        <div
            key={service.id}
            className={cn(
                "rounded-2xl p-5 bg-white shadow-lg flex flex-col justify-between border-l-8 w-[400px] shrink-0 h-full transition-all duration-300",
                service.is_urgent ? "border-red-500 bg-red-50/10" : "border-[#2B4F84]/80"
            )}
        >
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="font-mono text-3xl font-black text-[#2B4F84] tracking-tighter leading-none">
                            {service.code}
                        </p>
                        <div
                            className={cn(
                                "px-3 py-1 rounded-lg text-sm font-bold uppercase tracking-wide inline-block shadow-sm",
                                SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.color || "bg-slate-200 text-slate-700"
                            )}
                        >
                            {SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.label}
                        </div>
                    </div>
                    {service.is_urgent && (
                        <div className="bg-red-600 text-white px-3 py-1 rounded-xl text-sm font-black shadow-md animate-pulse flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 fill-current" />
                            URGENTE
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <p className="text-xl font-black text-slate-900 leading-tight uppercase truncate" title={service.customer_name || ""}>
                        {service.customer_name || "CLIENTE"}
                    </p>
                    <div className="flex items-center gap-2 text-slate-500">
                        <Building2 className="h-5 w-5" />
                        <p className="text-sm font-bold uppercase tracking-tight truncate">
                            {service.appliance_type || "EQUIPAMENTO"}
                        </p>
                    </div>
                </div>

                {service.fault_description && (
                    <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 shadow-inner">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">Sintoma</p>
                        <p className="text-sm text-slate-600 font-medium line-clamp-2 leading-snug italic">
                            "{service.fault_description}"
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
                {service.technician_id ? (
                    <div className="flex items-center gap-4 bg-[#2B4F84]/5 p-3 rounded-xl border border-[#2B4F84]/10">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black text-white shadow-md shrink-0 border-2 border-white"
                            style={{ backgroundColor: service.tech_color || "#2B4F84" }}
                        >
                            {service.tech_name?.charAt(0)}
                        </div>
                        <div className="space-y-0.5">
                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-wider">Técnico</p>
                            <p className="text-base font-black text-[#2B4F84] uppercase tracking-tight">{service.tech_name}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-3 border border-dashed border-amber-200/50">
                        <User className="h-6 w-6 text-amber-500" />
                        <span className="text-sm font-black text-amber-600 uppercase tracking-tight">Aguardando Técnico</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-screen w-screen bg-[#F8FAFC] text-slate-900 flex flex-col overflow-hidden select-none font-sans antialiased">

            {/* 1. Header - Compact for 24 inch (Height: 12vh max 110px) */}
            <header className="h-[12vh] max-h-[110px] flex items-center justify-between px-6 bg-white shadow-md border-b-4 border-[#2B4F84] z-50 relative shrink-0">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img src={tecnofrioLogoIcon} alt="TECNOFRIO" className="h-14 w-14 object-contain" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                    </div>
                    <div className="space-y-0.5">
                        <h1 className="text-3xl font-black tracking-tighter leading-none text-[#2B4F84]">
                            TECNO<span className="text-slate-300">FRIO</span>
                        </h1>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Monitor de Fluxo</p>
                    </div>
                </div>

                <div className="text-right space-y-0.5">
                    <p className="text-4xl font-mono font-black text-[#2B4F84] tabular-nums leading-none tracking-tight">
                        {format(currentTime, "HH:mm:ss")}
                    </p>
                    <div className="flex items-center justify-end gap-2 text-slate-500 font-bold">
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        <p className="text-sm uppercase tracking-tight">
                            {format(currentTime, "EEEE, d 'de' MMMM", { locale: pt })}
                        </p>
                    </div>
                </div>
            </header>

            {/* 2. Content Area - 24 inch optimized rows */}
            <main className="flex-1 flex flex-col overflow-hidden py-4 gap-4 px-4 bg-[#F1F5F9]">

                {/* Row 1 */}
                <div className="flex-1 relative overflow-hidden flex items-center">
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
                <div className="flex-1 relative overflow-hidden flex items-center">
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

            {/* 3. Footer - Height 15vh max 140px */}
            <footer className="h-[15vh] max-h-[140px] flex flex-col z-50 shrink-0">
                <div className="flex-1 bg-[#2B4F84] border-t-4 border-yellow-400 p-4 relative overflow-hidden shadow-lg flex items-center">
                    <div className="absolute left-6 flex items-center gap-3 z-20 bg-[#2B4F84] pr-6 py-1">
                        <Activity className="h-6 w-6 text-yellow-400 animate-pulse" />
                        <span className="text-xl text-yellow-400 font-black uppercase tracking-widest hidden lg:inline">
                            Eventos
                        </span>
                    </div>

                    <div className="flex-1 overflow-hidden relative h-full flex items-center">
                        <div className="flex gap-10 animate-marquee whitespace-nowrap items-center w-max pl-40">
                            {activityLogs.length === 0 ? (
                                <span className="text-white/30 text-lg font-bold uppercase italic tracking-wider">Aguardando atualizações do sistema...</span>
                            ) : (
                                activityLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-center gap-4 bg-white/10 border border-white/20 rounded-xl px-6 py-2 backdrop-blur-sm"
                                    >
                                        <span className="text-lg text-yellow-300 font-mono font-bold">
                                            [{format(new Date(log.created_at), "HH:mm")}]
                                        </span>
                                        <span className="text-xl text-white font-bold tracking-tight uppercase">
                                            {log.description}
                                        </span>
                                    </div>
                                ))
                            )}
                            {/* Duplicate for Marquee Loop */}
                            {activityLogs.length > 0 && activityLogs.map((log) => (
                                <div
                                    key={`${log.id}-dup`}
                                    className="flex items-center gap-4 bg-white/10 border border-white/20 rounded-xl px-6 py-2 backdrop-blur-sm"
                                >
                                    <span className="text-lg text-yellow-300 font-mono font-bold">
                                        [{format(new Date(log.created_at), "HH:mm")}]
                                    </span>
                                    <span className="text-xl text-white font-bold tracking-tight uppercase">
                                        {log.description}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="h-[40px] bg-white px-6 flex items-center justify-between border-t border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sistema V2.1 - 24" Optimized</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="text-sm font-black text-slate-700 uppercase tracking-tighter">
                            {services.length} <span className="text-slate-400 font-bold">Serviços</span>
                        </p>
                        <button
                            onClick={handleLogout}
                            className="group text-slate-300 hover:text-red-500 transition-colors"
                            title="Sair do Monitor"
                        >
                            <LogOut className="h-5 w-5" />
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
