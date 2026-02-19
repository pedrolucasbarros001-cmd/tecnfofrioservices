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
} from
  "lucide-react";
import { useNavigate } from "react-router-dom";
import tecnofrioLogoIcon from "@/assets/tecnofrio-logo-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_STATUS_CONFIG } from "@/types/database";
import { usePublicActivityLogs } from "@/hooks/useActivityLogs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

  const groupedServices = MONITOR_SECTIONS.reduce(
    (acc, section) => {
      acc[section.key] = services.filter(section.filter);
      return acc;
    },
    {} as Record<string, TVMonitorService[]>
  );

  // Divide services into two rows for the carousel
  const half = Math.ceil(services.length / 2);
  const topRowServices = services.slice(0, half);
  const bottomRowServices = services.slice(half);

  // Helper to render a service card (more compact)
  const renderServiceCard = (service: TVMonitorService) => (
    <div
      key={service.id}
      className={cn(
        "rounded-xl p-2.5 bg-white transition-all shadow-sm flex flex-col justify-between border w-[280px] shrink-0",
        service.is_urgent ? "border-red-500 bg-red-50/30" : "border-slate-200"
      )}
    >
      <div>
        <div className="flex items-start justify-between mb-1.5">
          <div>
            <p className="font-mono text-base lg:text-lg font-black text-[#2B4F84] leading-tight">{service.code}</p>
            <div
              className={cn(
                "mt-0.5 px-1.5 py-0 rounded text-[9px] font-bold inline-block",
                SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.color
              )}
            >
              {SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.label}
            </div>
          </div>
          {service.is_urgent && (
            <div className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm flex items-center gap-1">
              <AlertCircle className="h-2.5 w-2.5" />
              URGENTE
            </div>
          )}
        </div>
        <div className="mb-1.5">
          <p className="text-base font-black text-slate-800 truncate leading-tight">{service.customer_name || "Cliente"}</p>
          <p className="text-slate-500 font-bold text-[10px] flex items-center gap-1.5 mt-0.5">
            <Building2 className="h-2.5 w-2.5" />
            <span className="truncate">{service.appliance_type || "Aparelho"}</span>
          </p>
        </div>
        {service.fault_description && (
          <div className="bg-slate-50 rounded-lg p-1.5 mb-1.5 border border-slate-100 shadow-inner">
            <p className="text-[7px] text-slate-400 font-black uppercase mb-0.5">Avaria</p>
            <p className="text-[10px] text-slate-700 font-medium line-clamp-1">{service.fault_description}</p>
          </div>
        )}
      </div>
      <div>
        {service.technician_id ? (
          <div className="flex items-center gap-1.5 bg-blue-50/50 p-1 rounded-lg">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm shrink-0"
              style={{ backgroundColor: service.tech_color || "#2B4F84" }}
            >
              {service.tech_name?.charAt(0)}
            </div>
            <span className="text-[9px] font-bold text-slate-700 uppercase truncate">{service.tech_name}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-amber-50 rounded-lg p-1 border border-amber-100">
            <User className="h-3 w-3 text-amber-500" />
            <span className="text-[9px] font-black text-amber-600 uppercase">Disponível</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 text-slate-900 flex flex-col overflow-hidden select-none">
      {/* Header - Fixed & More compact */}
      <header className="flex items-center justify-between p-3 lg:p-4 bg-white shadow-sm border-b border-slate-200 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <img src={tecnofrioLogoIcon} alt="TECNOFRIO" className="h-10 w-10 lg:h-12 lg:w-12 object-contain" />
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight leading-none">
              <span className="text-[#2B4F84]">TECNO</span>
              <span className="text-slate-400">FRIO</span>
            </h1>
            <p className="text-slate-500 text-xs lg:text-sm font-medium mt-0.5">Monitor de Fluxo da Oficina</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl lg:text-3xl font-mono font-bold text-[#2B4F84] leading-none">{format(currentTime, "HH:mm:ss")}</p>
          <p className="text-slate-600 text-sm lg:text-base font-medium">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
          <div className="flex items-center justify-end gap-2 mt-0.5 text-slate-400 text-[10px]">
            <RefreshCw className="h-2.5 w-2.5" />
            <span>Sincronizado: {format(lastRefresh, "HH:mm:ss")}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-3 gap-3 overflow-hidden">
        {/* Contadores Section - Compact row */}
        <div className="grid grid-cols-7 gap-2 shrink-0">
          {MONITOR_SECTIONS.map((section) => {
            const count = groupedServices[section.key]?.length || 0;
            return (
              <div
                key={section.key}
                className={cn(
                  "rounded-xl p-2 text-center transition-all border",
                  count > 0 ?
                    "bg-white border-[#2B4F84] shadow-sm ring-2 ring-[#2B4F84]/5" :
                    "bg-slate-100/50 border-transparent opacity-40"
                )}
              >
                <p className={cn("text-xl lg:text-2xl font-black leading-tight", count > 0 ? "text-[#2B4F84]" : "text-slate-400")}>
                  {count}
                </p>
                <p className="text-[8px] lg:text-[10px] font-bold text-slate-600 uppercase tracking-wider truncate">{section.label}</p>
              </div>
            );
          })}
        </div>

        {/* Dynamic Carousel Area - Two Scrolling Rows */}
        <div className="flex-1 flex flex-col justify-center gap-4 py-2 overflow-hidden relative">
          {/* Top Row Carousel */}
          <div className="services-carousel-container h-[140px] relative overflow-hidden flex items-center">
            <div
              className={cn(
                "flex gap-4",
                topRowServices.length > 5 ? "animate-scroll-slow" : "justify-center w-full"
              )}
            >
              {topRowServices.map(renderServiceCard)}
              {/* Duplicate for seamless infinite scroll if many items */}
              {topRowServices.length > 5 && topRowServices.map((s) => ({ ...s, id: `${s.id}-dup` })).map(renderServiceCard)}
            </div>
          </div>

          {/* Bottom Row Carousel */}
          <div className="services-carousel-container h-[140px] relative overflow-hidden flex items-center">
            <div
              className={cn(
                "flex gap-4",
                bottomRowServices.length > 5 ? "animate-scroll-slow-reverse" : "justify-center w-full"
              )}
            >
              {bottomRowServices.map(renderServiceCard)}
              {/* Duplicate for seamless infinite scroll if many items */}
              {bottomRowServices.length > 5 && bottomRowServices.map((s) => ({ ...s, id: `${s.id}-dup` })).map(renderServiceCard)}
            </div>
          </div>
        </div>
      </main>

      {/* RODAPÉ GIGANTE - BARRA DE TAREFAS - Restored with fixes */}
      <footer className="shrink-0 shadow-2xl z-30">
        <div className="bg-[#2B4F84] border-t-4 border-yellow-400 p-4 lg:p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-5 w-5 text-yellow-400 animate-bounce shadow-sm" />
            <span className="text-lg lg:text-xl text-yellow-400 font-black uppercase tracking-widest">
              Tarefas Adicionais & Avisos Administrativos
            </span>
          </div>

          <div className="overflow-hidden relative h-14 lg:h-16 flex items-center">
            <div className="flex gap-8 lg:gap-10 animate-marquee whitespace-nowrap items-center">
              {activityLogs.length === 0 ?
                <span className="text-slate-300 text-xl lg:text-2xl font-medium">A aguardar novas orientações...</span> :
                activityLogs.map((log) =>
                  <div
                    key={log.id}
                    className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-6 lg:px-8 py-3 lg:py-4 flex items-center gap-3 lg:gap-4"
                  >
                    <span className="text-lg lg:text-xl text-yellow-200 font-mono font-bold opacity-70">
                      [{format(new Date(log.created_at), "HH:mm")}]
                    </span>
                    <span className="text-xl lg:text-2xl text-white font-black tracking-tight uppercase leading-none">{log.description}</span>
                  </div>
                )
              }
              {/* Duplicate for infinite marquee effect */}
              {activityLogs.length > 0 && activityLogs.map((log) => (
                <div
                  key={`${log.id}-dup`}
                  className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-6 lg:px-8 py-3 lg:py-4 flex items-center gap-3 lg:gap-4"
                >
                  <span className="text-lg lg:text-xl text-yellow-200 font-mono font-bold opacity-70">
                    [{format(new Date(log.created_at), "HH:mm")}]
                  </span>
                  <span className="text-xl lg:text-2xl text-white font-black tracking-tight uppercase leading-none">{log.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white px-4 lg:px-6 py-2 lg:py-3 flex items-center justify-between border-t border-slate-200">
          <span className="text-lg lg:text-xl font-black">
            <span className="text-[#2B4F84]">TECNO</span>
            <span className="text-slate-200">FRIO</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="text-base lg:text-lg font-bold text-slate-500 uppercase tracking-tighter">
              {services.length} SERVIÇOS ATIVOS
            </span>
            <button onClick={handleLogout} className="text-slate-300 hover:text-slate-500 transition-colors p-1">
              <LogOut className="h-4 w-4 lg:h-5 lg:w-5" />
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
          100% { transform: translateX(calc(-50% - 0.5rem)); }
        }
        @keyframes scroll-slow-reverse {
          0% { transform: translateX(calc(-50% - 0.5rem)); }
          100% { transform: translateX(0); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
          display: inline-flex;
        }
        .animate-scroll-slow {
          animation: scroll-slow 30s linear infinite;
        }
        .animate-scroll-slow-reverse {
          animation: scroll-slow-reverse 35s linear infinite;
        }
        .services-carousel-container:hover .animate-scroll-slow,
        .services-carousel-container:hover .animate-scroll-slow-reverse {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

