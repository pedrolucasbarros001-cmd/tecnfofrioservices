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
  LogOut } from
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 lg:p-6 pb-64">
      {/* Header */}
      <header className="flex items-center justify-between mb-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-6">
          <img src={tecnofrioLogoIcon} alt="TECNOFRIO" className="h-16 w-16 lg:h-20 lg:w-20 object-contain" />
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              <span className="text-[#2B4F84]">TECNO</span>
              <span className="text-slate-400">FRIO</span>
            </h1>
            <p className="text-slate-500 text-lg font-medium">Monitor de Fluxo da Oficina</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-4xl lg:text-5xl font-mono font-bold text-[#2B4F84]">{format(currentTime, "HH:mm:ss")}</p>
          <p className="text-slate-600 text-lg lg:text-xl font-medium">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
          <div className="flex items-center justify-end gap-2 mt-2 text-slate-400 text-sm">
            <RefreshCw className="h-4 w-4" />
            <span>Sincronizado: {format(lastRefresh, "HH:mm:ss")}</span>
          </div>
        </div>
      </header>

      {/* Contadores */}
      <div className="grid grid-cols-7 gap-4 mb-8">
        {MONITOR_SECTIONS.map((section) => {
          const count = groupedServices[section.key]?.length || 0;
          return (
            <div
              key={section.key}
              className={cn(
                "rounded-2xl p-5 text-center transition-all border-2",
                count > 0 ?
                "bg-white border-[#2B4F84] shadow-md ring-4 ring-[#2B4F84]/5" :
                "bg-slate-100 border-transparent opacity-60"
              )}>

              <p
                className={cn("text-4xl lg:text-5xl font-black mb-1", count > 0 ? "text-[#2B4F84]" : "text-slate-400")}>

                {count}
              </p>
              <p className="text-sm lg:text-base font-bold text-slate-600 uppercase tracking-wider">{section.label}</p>
            </div>);

        })}
      </div>

      {/* Lista de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 mb-8">
        {services.map((service) =>
        <div
          key={service.id}
          className={cn("rounded-2xl p-6 bg-white border-2 transition-all shadow-sm flex flex-col justify-between py-[10px]",

          service.is_urgent ? "border-red-500 bg-red-50/30" : "border-slate-200"
          )}>

            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-mono text-2xl lg:text-3xl font-black text-[#2B4F84]">{service.code}</p>
                  <div
                  className={cn(
                    "mt-2 px-2 py-1 rounded text-sm font-bold inline-block",
                    SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.color
                  )}>

                    {SERVICE_STATUS_CONFIG[service.status as keyof typeof SERVICE_STATUS_CONFIG]?.label}
                  </div>
                </div>
                {service.is_urgent &&
              <div className="bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    URGENTE
                  </div>
              }
              </div>
              <div className="mb-4">
                <p className="text-xl font-black text-slate-800 truncate">{service.customer_name || "Cliente"}</p>
                <p className="text-slate-500 font-bold text-sm lg:text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {service.appliance_type || "Aparelho"}
                </p>
              </div>
              {service.fault_description &&
            <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100 shadow-inner">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Avaria</p>
                  <p className="text-base text-slate-700 font-medium line-clamp-3">{service.fault_description}</p>
                </div>
            }
            </div>
            <div>
              {service.technician_id ?
            <div className="flex items-center gap-3 bg-blue-50/50 p-2 rounded-xl mb-4">
                  <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black text-white shadow-md"
                style={{ backgroundColor: service.tech_color || "#2B4F84" }}>

                    {service.tech_name?.charAt(0)}
                  </div>
                  <span className="text-base font-bold text-slate-700 uppercase">{service.tech_name}</span>
                </div> :

            <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-3 mb-4 border border-amber-100">
                  <User className="h-6 w-6 text-amber-500" />
                  <span className="text-base font-black text-amber-600 uppercase">Disponível</span>
                </div>
            }
            </div>
          </div>
        )}
      </div>

      {/* RODAPÉ GIGANTE - BARRA DE TAREFAS */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 shadow-2xl">
        <div className="bg-[#2B4F84] border-t-4 border-yellow-400 p-6 py-[2px] px-[2px]">
          <div className="flex items-center gap-4 mb-3">
            <Activity className="h-6 w-6 text-yellow-400 animate-bounce" />
            <span className="text-xl text-yellow-400 font-black uppercase tracking-widest">
              Tarefas Adicionais & Avisos Administrativos
            </span>
          </div>

          <div className="overflow-hidden relative h-20 flex items-center">
            <div className="flex gap-10 animate-marquee whitespace-nowrap">
              {activityLogs.length === 0 ?
              <span className="text-slate-300 text-2xl font-medium">A aguardar novas orientações...</span> :

              activityLogs.map((log) =>
              <div
                key={log.id}
                className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-8 py-4 flex items-center gap-4">

                    <span className="text-xl text-yellow-200 font-mono font-bold opacity-70">
                      [{format(new Date(log.created_at), "HH:mm")}]
                    </span>
                    <span className="text-2xl text-white font-black tracking-tight uppercase">{log.description}</span>
                  </div>
              )
              }
            </div>
          </div>
        </div>

        <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <span className="text-xl font-black">
            <span className="text-[#2B4F84]">TECNO</span>
            <span className="text-slate-300">FRIO</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-slate-600 uppercase tracking-tighter">
              {services.length} SERVIÇOS ATIVOS
            </span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 transition-colors">
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
        .animate-marquee {
          animation: marquee 40s linear infinite;
          display: inline-flex;
        }
      `}</style>
    </div>);

}