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
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import tecnofrioLogoIcon from "@/assets/tecnofrio-logo-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_STATUS_CONFIG } from "@/types/database";
import { usePublicActivityLogs } from "@/hooks/useActivityLogs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Tipo de Serviço
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

const MONITOR_SECTIONS = [
  {
    key: "para_assumir",
    label: "Para Assumir",
    filter: (s: TVMonitorService) => !s.technician_id && ["por_fazer", "na_oficina"].includes(s.status || ""),
  },
  {
    key: "na_oficina",
    label: "Oficina",
    filter: (s: TVMonitorService) => !!s.technician_id && ["por_fazer", "na_oficina"].includes(s.status || ""),
  },
  { key: "em_execucao", label: "Em Execução", filter: (s: TVMonitorService) => s.status === "em_execucao" },
  { key: "para_pedir_peca", label: "Pedir Peça", filter: (s: TVMonitorService) => s.status === "para_pedir_peca" },
  {
    key: "em_espera_de_peca",
    label: "Espera de Peça",
    filter: (s: TVMonitorService) => s.status === "em_espera_de_peca",
  },
  { key: "a_precificar", label: "Precificar", filter: (s: TVMonitorService) => s.status === "a_precificar" },
  { key: "concluidos", label: "Reparados", filter: (s: TVMonitorService) => s.status === "concluidos" },
];

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
    isError,
  } = useQuery({
    queryKey: ["tv-monitor-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tv_monitor_services")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TVMonitorService[];
    },
    refetchInterval: 30000,
  });

  const { data: activityLogs = [] } = usePublicActivityLogs(10);

  const groupedServices = MONITOR_SECTIONS.reduce(
    (acc, section) => {
      acc[section.key] = services.filter(section.filter);
      return acc;
    },
    {} as Record<string, TVMonitorService[]>,
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-3 lg:p-4 pb-60">
      {/* Header Compacto */}
      <header className="flex items-center justify-between mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <img src={tecnofrioLogoIcon} alt="TECNOFRIO" className="h-10 w-10 lg:h-12 lg:w-12 object-contain" />
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">
              <span className="text-[#2B4F84]">TECNO</span>
              <span className="text-slate-400">FRIO</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">Monitor de Fluxo</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl lg:text-3xl font-mono font-bold text-[#2B4F84] leading-none">
            {format(currentTime, "HH:mm:ss")}
          </p>
          <p className="text-slate-600 text-sm lg:text-base font-medium">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
        </div>
      </header>

      {/* Contadores Compactos */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {MONITOR_SECTIONS.map((section) => {
          const count = groupedServices[section.key]?.length || 0;
          return (
            <div
              key={section.key}
              className={cn(
                "rounded-xl p-3 text-center transition-all border",
                count > 0 ? "bg-white border-[#2B4F84] shadow-sm" : "bg-slate-100 border-transparent opacity-60",
              )}
            >
              <p className={cn("text-2xl lg:text-3xl font-black", count > 0 ? "text-[#2B4F84]" : "text-slate-400")}>
                {count}
              </p>
              <p className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-tighter">
                {section.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Grelha de Serviços (Até 6 colunas em ecrãs grandes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-6">
        {services.map((service) => (
          <div
            key={service.id}
            className={cn(
              "rounded-xl p-4 bg-white border transition-all shadow-sm flex flex-col justify-between h-full min-h-[180px]",
              service.is_urgent ? "border-red-500 ring-2 ring-red-100" : "border-slate-200",
            )}
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <p className="font-mono text-xl font-black text-[#2B4F84]">{service.code}</p>
                {service.is_urgent && (
                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                    URGENTE
                  </Badge>
                )}
              </div>

              <div className="mb-2">
                <p className="text-sm font-black text-slate-800 line-clamp-1">{service.customer_name || "Cliente"}</p>
                <div
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-1",
                    SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.color,
                  )}
                >
                  {SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.label}
                </div>
              </div>

              <p className="text-slate-500 font-bold text-[11px] flex items-center gap-1 mb-2">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{service.appliance_type || "Aparelho"}</span>
              </p>

              {service.fault_description && (
                <div className="bg-slate-50 rounded-lg p-2 mb-2 border border-slate-100">
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight italic">
                    "{service.fault_description}"
                  </p>
                </div>
              )}
            </div>

            <div className="mt-auto pt-2 border-t border-slate-50">
              {service.technician_id ? (
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ backgroundColor: service.tech_color || "#2B4F84" }}
                  >
                    {service.tech_name?.charAt(0)}
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 truncate uppercase">{service.tech_name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-500">
                  <User className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase">Disponível</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer com Letreiro de Tarefas */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
        <div className="bg-[#2B4F84] border-t-4 border-yellow-400 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-5 w-5 text-yellow-400 animate-bounce" />
            <span className="text-sm text-yellow-400 font-black uppercase tracking-widest">Avisos Administrativos</span>
          </div>

          <div className="overflow-hidden relative h-14 flex items-center bg-black/10 rounded-lg border border-white/5">
            <div className="flex gap-12 animate-marquee whitespace-nowrap px-4">
              {activityLogs.length === 0 ? (
                <span className="text-slate-300 text-lg font-medium opacity-50">Sem novas ordens...</span>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3">
                    <span className="text-sm text-yellow-200 font-mono font-bold opacity-60">
                      [{format(new Date(log.created_at), "HH:mm")}]
                    </span>
                    <span className="text-xl text-white font-black tracking-tight uppercase">{log.description}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white px-6 py-3 flex items-center justify-between border-t border-slate-200">
          <span className="text-lg font-black text-[#2B4F84]">
            TECNO <span className="text-slate-300 font-bold uppercase text-xs tracking-widest">Oficina</span>
          </span>
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">
              {services.length} SERVIÇOS EM FLUXO
            </span>
            <button onClick={handleLogout} className="text-slate-300 hover:text-red-500 transition-colors">
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
        .animate-marquee {
          animation: marquee 35s linear infinite;
          display: inline-flex;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
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
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import tecnofrioLogoIcon from "@/assets/tecnofrio-logo-icon.png";
import { supabase } from "@/integrations/supabase/client";
import { SERVICE_STATUS_CONFIG } from "@/types/database";
import { usePublicActivityLogs } from "@/hooks/useActivityLogs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Tipo de Serviço
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

const MONITOR_SECTIONS = [
  {
    key: "para_assumir",
    label: "Para Assumir",
    filter: (s: TVMonitorService) => !s.technician_id && ["por_fazer", "na_oficina"].includes(s.status || ""),
  },
  {
    key: "na_oficina",
    label: "Oficina",
    filter: (s: TVMonitorService) => !!s.technician_id && ["por_fazer", "na_oficina"].includes(s.status || ""),
  },
  { key: "em_execucao", label: "Em Execução", filter: (s: TVMonitorService) => s.status === "em_execucao" },
  { key: "para_pedir_peca", label: "Pedir Peça", filter: (s: TVMonitorService) => s.status === "para_pedir_peca" },
  {
    key: "em_espera_de_peca",
    label: "Espera de Peça",
    filter: (s: TVMonitorService) => s.status === "em_espera_de_peca",
  },
  { key: "a_precificar", label: "Precificar", filter: (s: TVMonitorService) => s.status === "a_precificar" },
  { key: "concluidos", label: "Reparados", filter: (s: TVMonitorService) => s.status === "concluidos" },
];

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
    isError,
  } = useQuery({
    queryKey: ["tv-monitor-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tv_monitor_services")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TVMonitorService[];
    },
    refetchInterval: 30000,
  });

  const { data: activityLogs = [] } = usePublicActivityLogs(10);

  const groupedServices = MONITOR_SECTIONS.reduce(
    (acc, section) => {
      acc[section.key] = services.filter(section.filter);
      return acc;
    },
    {} as Record<string, TVMonitorService[]>,
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-3 lg:p-4 pb-60">
      {/* Header Compacto */}
      <header className="flex items-center justify-between mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <img src={tecnofrioLogoIcon} alt="TECNOFRIO" className="h-10 w-10 lg:h-12 lg:w-12 object-contain" />
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight">
              <span className="text-[#2B4F84]">TECNO</span>
              <span className="text-slate-400">FRIO</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">Monitor de Fluxo</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl lg:text-3xl font-mono font-bold text-[#2B4F84] leading-none">
            {format(currentTime, "HH:mm:ss")}
          </p>
          <p className="text-slate-600 text-sm lg:text-base font-medium">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
        </div>
      </header>

      {/* Contadores Compactos */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {MONITOR_SECTIONS.map((section) => {
          const count = groupedServices[section.key]?.length || 0;
          return (
            <div
              key={section.key}
              className={cn(
                "rounded-xl p-3 text-center transition-all border",
                count > 0 ? "bg-white border-[#2B4F84] shadow-sm" : "bg-slate-100 border-transparent opacity-60",
              )}
            >
              <p className={cn("text-2xl lg:text-3xl font-black", count > 0 ? "text-[#2B4F84]" : "text-slate-400")}>
                {count}
              </p>
              <p className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-tighter">
                {section.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Grelha de Serviços (Até 6 colunas em ecrãs grandes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 mb-6">
        {services.map((service) => (
          <div
            key={service.id}
            className={cn(
              "rounded-xl p-4 bg-white border transition-all shadow-sm flex flex-col justify-between h-full min-h-[180px]",
              service.is_urgent ? "border-red-500 ring-2 ring-red-100" : "border-slate-200",
            )}
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <p className="font-mono text-xl font-black text-[#2B4F84]">{service.code}</p>
                {service.is_urgent && (
                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                    URGENTE
                  </Badge>
                )}
              </div>

              <div className="mb-2">
                <p className="text-sm font-black text-slate-800 line-clamp-1">{service.customer_name || "Cliente"}</p>
                <div
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded inline-block mt-1",
                    SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.color,
                  )}
                >
                  {SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.label}
                </div>
              </div>

              <p className="text-slate-500 font-bold text-[11px] flex items-center gap-1 mb-2">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{service.appliance_type || "Aparelho"}</span>
              </p>

              {service.fault_description && (
                <div className="bg-slate-50 rounded-lg p-2 mb-2 border border-slate-100">
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight italic">
                    "{service.fault_description}"
                  </p>
                </div>
              )}
            </div>

            <div className="mt-auto pt-2 border-t border-slate-50">
              {service.technician_id ? (
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ backgroundColor: service.tech_color || "#2B4F84" }}
                  >
                    {service.tech_name?.charAt(0)}
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 truncate uppercase">{service.tech_name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-500">
                  <User className="h-4 w-4" />
                  <span className="text-[10px] font-black uppercase">Disponível</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer com Letreiro de Tarefas */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
        <div className="bg-[#2B4F84] border-t-4 border-yellow-400 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-5 w-5 text-yellow-400 animate-bounce" />
            <span className="text-sm text-yellow-400 font-black uppercase tracking-widest">Avisos Administrativos</span>
          </div>

          <div className="overflow-hidden relative h-14 flex items-center bg-black/10 rounded-lg border border-white/5">
            <div className="flex gap-12 animate-marquee whitespace-nowrap px-4">
              {activityLogs.length === 0 ? (
                <span className="text-slate-300 text-lg font-medium opacity-50">Sem novas ordens...</span>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3">
                    <span className="text-sm text-yellow-200 font-mono font-bold opacity-60">
                      [{format(new Date(log.created_at), "HH:mm")}]
                    </span>
                    <span className="text-xl text-white font-black tracking-tight uppercase">{log.description}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-white px-6 py-3 flex items-center justify-between border-t border-slate-200">
          <span className="text-lg font-black text-[#2B4F84]">
            TECNO <span className="text-slate-300 font-bold uppercase text-xs tracking-widest">Oficina</span>
          </span>
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">
              {services.length} SERVIÇOS EM FLUXO
            </span>
            <button onClick={handleLogout} className="text-slate-300 hover:text-red-500 transition-colors">
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
        .animate-marquee {
          animation: marquee 35s linear infinite;
          display: inline-flex;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
