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

// Configuração das Secções do Monitor
const MONITOR_SECTIONS = [
    {
        key: "para_assumir",
        label: "Para Assumir",
        icon: User,
        filter: (s: TVMonitorService) => !s.technician_id && ["por_fazer", "na_oficina"].includes(s.status || "")
    },
    {
        key: "na_oficina",
        label: "Oficina",
        icon: Building2,
        filter: (s: TVMonitorService) => !!s.technician_id && ["por_fazer", "na_oficina"].includes(s.status || "")
    },
    {
        key: "em_execucao",
        label: "Em Execução",
        icon: Play,
        filter: (s: TVMonitorService) => s.status === "em_execucao"
    },
    {
        key: "para_pedir_peca",
        label: "Pedir Peça",
        icon: Package,
        filter: (s: TVMonitorService) => s.status === "para_pedir_peca"
    },
    {
        key: "em_espera_de_peca",
        label: "Espera de Peça",
        icon: Clock,
        filter: (s: TVMonitorService) => s.status === "em_espera_de_peca"
    },
    {
        key: "a_precificar",
        label: "Precificar",
        icon: DollarSign,
        filter: (s: TVMonitorService) => s.status === "a_precificar"
    },
    {
        key: "concluidos",
        label: "Of. Reparados",
        icon: CheckCircle,
        filter: (s: TVMonitorService) => s.status === "concluidos"
    }];


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

    // Carousel Logic: Interleave services between two rows for a balanced look
    const topRowServices = services.filter((_, i) => i % 2 === 0);
    const bottomRowServices = services.filter((_, i) => i % 2 !== 0);

    // Helper to render a service card (Redesigned for MASSIVE visibility on 4K/Large TVs)
    const renderServiceCard = (service: TVMonitorService) => (
        <div
            key={service.id}
            className={cn(
                "rounded-[3rem] p-12 bg-white shadow-2xl flex flex-col justify-between border-[8px] w-[700px] xl:w-[850px] shrink-0 h-full transition-all duration-300",
                service.is_urgent ? "border-red-500 bg-red-50/50" : "border-slate-100"
            )}
        >
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <p className="font-mono text-6xl xl:text-7xl font-black text-[#2B4F84] tracking-tighter leading-none">
                            {service.code}
                        </p>
                        <div
                            className={cn(
                                "px-6 py-2 rounded-2xl text-2xl xl:text-3xl font-black uppercase tracking-widest inline-block shadow-sm",
                                SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.color || "bg-slate-200 text-slate-700"
                            )}
                        >
                            {SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.label}
                        </div>
                    </div>
                    {service.is_urgent && (
                        <div className="bg-red-600 text-white px-8 py-4 rounded-3xl text-3xl font-black shadow-[0_0_60px_rgba(220,38,38,0.4)] animate-pulse flex items-center gap-4">
                            <AlertCircle className="h-10 w-10 fill-current" />
                            URGENTE
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <p className="text-5xl xl:text-6xl font-black text-slate-900 leading-tight uppercase truncate drop-shadow-sm">
                        {service.customer_name || "CLIENTE"}
                    </p>
                    <div className="flex items-center gap-5 text-slate-400">
                        <Building2 className="h-10 w-10" />
                        <p className="text-3xl xl:text-4xl font-bold uppercase tracking-tight truncate">
                            {service.appliance_type || "EQUIPAMENTO"}
                        </p>
                    </div>
                </div>

                {service.fault_description && (
                    <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border-4 border-slate-100 shadow-inner">
                        <p className="text-sm text-slate-400 font-black uppercase mb-3 tracking-[0.3em]">Sintoma / Avaria</p>
                        <p className="text-2xl xl:text-3xl text-slate-600 font-bold line-clamp-2 leading-relaxed italic">
                            "{service.fault_description}"
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-8 border-t-[6px] border-slate-50">
                {service.technician_id ? (
                    <div className="flex items-center gap-8 bg-[#2B4F84]/5 p-6 rounded-[2.5rem] border-4 border-[#2B4F84]/10">
                        <div
                            className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-xl shrink-0 border-[6px] border-white"
                            style={{ backgroundColor: service.tech_color || "#2B4F84" }}
                        >
                            {service.tech_name?.charAt(0)}
                        </div>
                        <div className="space-y-1">
                            <p className="text-base text-blue-400 font-black uppercase tracking-[0.4em]">Técnico</p>
                            <p className="text-4xl font-black text-[#2B4F84] uppercase tracking-tighter">{service.tech_name}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-6 bg-amber-50 rounded-[2.5rem] p-8 border-[6px] border-dashed border-amber-200/50 shadow-inner">
                        <User className="h-12 w-12 text-amber-500" />
                        <span className="text-3xl font-black text-amber-600 uppercase tracking-tight">Pendente de Atribuição</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-screen w-screen bg-[#F1F5F9] text-slate-900 flex flex-col overflow-hidden select-none font-sans antialiased">
            {/* 1. Header - Fixed Viewport Height */}
            <header className="h-[14vh] min-h-[140px] flex items-center justify-between px-16 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] border-b-[12px] border-[#2B4F84] z-50 relative">
                <div className="flex items-center gap-10">
                    <div className="relative">
                        <img src={tecnofrioLogoIcon} alt="TECNOFRIO" className="h-24 w-24 xl:h-28 xl:w-28 object-contain" />
                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 rounded-full border-[6px] border-white animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-6xl xl:text-7xl font-black tracking-tighter leading-none">
                            <span className="text-[#2B4F84]">TECNO</span>
                            <span className="text-slate-200">FRIO</span>
                        </h1>
                        <p className="text-slate-400 text-2xl xl:text-3xl font-bold uppercase tracking-[0.3em]">Fluxo Operacional</p>
                    </div>
                </div>

                <div className="text-right space-y-2">
                    <p className="text-7xl xl:text-8xl font-mono font-black text-[#2B4F84] tabular-nums leading-none tracking-tighter shadow-sm">
                        {format(currentTime, "HH:mm:ss")}
                    </p>
                    <div className="flex items-center justify-end gap-5 text-slate-500 font-black">
                        <RefreshCw className={cn("h-6 w-6", isLoading && "animate-spin")} />
                        <p className="text-2xl xl:text-3xl uppercase tracking-tight">
                            {format(currentTime, "EEEE, d 'de' MMMM", { locale: pt })}
                        </p>
                    </div>
                </div>
            </header>

            {/* 2. Content Area - Dynamic Flex for Rows */}
            <main className="flex-1 flex flex-col overflow-hidden py-10 gap-12 px-10">

                {/* Row 1 - Direct Horizontal Flow (Left to Right) */}
                <div className="flex-1 relative overflow-hidden flex items-center">
                    <div
                        className={cn(
                            "flex gap-12 h-full py-2",
                            topRowServices.length > 2 ? "animate-scroll-slow" : "justify-center w-full"
                        )}
                    >
                        {topRowServices.map(renderServiceCard)}
                        {/* Mirror Duplication for Infinite Seamless Loop (Only if many) */}
                        {topRowServices.length > 2 && topRowServices.map((s) => ({ ...s, id: `${s.id}-dup` })).map(renderServiceCard)}
                    </div>
                </div>

                {/* Row 2 - Inverse Horizontal Flow (Right to Left) */}
                <div className="flex-1 relative overflow-hidden flex items-center">
                    <div
                        className={cn(
                            "flex gap-12 h-full py-2",
                            bottomRowServices.length > 2 ? "animate-scroll-slow-reverse" : "justify-center w-full"
                        )}
                    >
                        {bottomRowServices.map(renderServiceCard)}
                        {/* Mirror Duplication for Infinite Seamless Loop (Only if many) */}
                        {bottomRowServices.length > 2 && bottomRowServices.map((s) => ({ ...s, id: `${s.id}-dup` })).map(renderServiceCard)}
                    </div>
                </div>
            </main>

            {/* 3. Footer Activity Ticker - Stable Large Section */}
            <footer className="h-[22vh] min-h-[220px] flex flex-col z-50">
                <div className="flex-1 bg-[#2B4F84] border-t-[12px] border-yellow-400 p-10 relative overflow-hidden shadow-[0_-25px_60px_rgba(0,0,0,0.3)]">
                    <div className="absolute top-8 left-12 flex items-center gap-5 z-20 bg-[#2B4F84] pr-10 py-2">
                        <Activity className="h-10 w-10 text-yellow-400 animate-pulse" />
                        <span className="text-3xl xl:text-4xl text-yellow-400 font-black uppercase tracking-[0.5em]">
                            Monitor de Eventos
                        </span>
                    </div>

                    <div className="h-full flex items-center pt-12">
                        <div className="flex gap-20 animate-marquee whitespace-nowrap items-center w-max">
                            {activityLogs.length === 0 ? (
                                <span className="text-white/20 text-5xl font-black uppercase italic tracking-widest">Sincronizando logs do sistema...</span>
                            ) : (
                                activityLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-center gap-10 bg-white/10 border-4 border-white/20 rounded-[3rem] px-16 py-8 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
                                    >
                                        <span className="text-4xl text-yellow-300 font-mono font-black drop-shadow-md">
                                            [{format(new Date(log.created_at), "HH:mm")}]
                                        </span>
                                        <span className="text-5xl text-white font-black tracking-tight uppercase">
                                            {log.description}
                                        </span>
                                    </div>
                                ))
                            )}
                            {/* Duplicate for Marquee Loop */}
                            {activityLogs.length > 0 && activityLogs.map((log) => (
                                <div
                                    key={`${log.id}-dup`}
                                    className="flex items-center gap-10 bg-white/10 border-4 border-white/20 rounded-[3rem] px-16 py-8 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
                                >
                                    <span className="text-4xl text-yellow-300 font-mono font-black drop-shadow-md">
                                        [{format(new Date(log.created_at), "HH:mm")}]
                                    </span>
                                    <span className="text-5xl text-white font-black tracking-tight uppercase">
                                        {log.description}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="h-[60px] bg-white px-16 flex items-center justify-between border-t-2 border-slate-100 shadow-inner">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 px-5 py-2 bg-green-50 rounded-full border-2 border-green-100">
                            <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse" />
                            <span className="text-sm font-black text-green-700 uppercase tracking-[0.2em]">Workstation Active</span>
                        </div>
                        <p className="text-base font-black text-slate-200 uppercase tracking-widest">v2.1.0 Cloud.Sinc</p>
                    </div>
                    <div className="flex items-center gap-12">
                        <p className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                            {services.length} <span className="text-slate-300">PROCESSOS ATIVOS</span>
                        </p>
                        <button
                            onClick={handleLogout}
                            className="group text-slate-200 hover:text-red-500 transition-all p-3 bg-slate-50 rounded-full shadow-sm hover:shadow-md hover:scale-110"
                        >
                            <LogOut className="h-8 w-8 transition-transform group-hover:rotate-12" />
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
          100% { transform: translateX(calc(-50% - 3rem)); }
        }
        @keyframes scroll-slow-reverse {
          0% { transform: translateX(calc(-50% - 3rem)); }
          100% { transform: translateX(0); }
        }
        .animate-marquee {
          animation: marquee 70s linear infinite;
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
        /* Extra smoothness */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
        </div>
    );
}
