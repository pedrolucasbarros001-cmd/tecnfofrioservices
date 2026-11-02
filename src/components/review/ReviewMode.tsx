/**
 * ReviewMode — Modo Cinematográfico de Inteligência
 *
 * Overlay fullscreen com 6 capítulos animados que narram o estado do negócio.
 * As transições simulam movimento de câmara: pan, zoom, dissolve e slide.
 * Guiado (auto-avançar) ou manual (← →).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useBusinessHealth } from '@/hooks/useDashboardMetrics';
import { useTeamPerformance } from '@/hooks/useDashboardMetrics';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewModeProps {
  open: boolean;
  onClose: () => void;
}

interface Chapter {
  id: string;
  label: string;
  icon: string;
}

const CHAPTERS: Chapter[] = [
  { id: 'saude',      label: 'Saúde Financeira',      icon: '💰' },
  { id: 'operacional', label: 'Actividade Operacional', icon: '⚙️' },
  { id: 'comercial',  label: 'Comercial',              icon: '📋' },
  { id: 'equipa',     label: 'Equipa',                 icon: '👥' },
  { id: 'alertas',    label: 'Alertas & Acções',       icon: '🚨' },
  { id: 'previsao',   label: 'Previsão',               icon: '🔭' },
];

const AUTO_ADVANCE_MS = 8000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function pct(n: number | undefined | null, total: number | undefined | null): string {
  if (!n || !total || total === 0) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

// ─── Counter hook (count-up animation) ───────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

// ─── Individual chapter slides ────────────────────────────────────────────────

function ChapterSaude({ metrics }: { metrics: any }) {
  const recebido  = useCountUp(metrics?.recebido ?? 0);
  const porReceber = useCountUp(metrics?.faturado_por_receber ?? 0);
  const porFaturar = useCountUp(metrics?.por_faturar_count ?? 0);

  const trend = metrics
    ? metrics.revenue_last_month > 0
      ? ((metrics.revenue_this_month - metrics.revenue_last_month) / metrics.revenue_last_month * 100).toFixed(1)
      : null
    : null;

  return (
    <div className="review-chapter flex flex-col items-center justify-center h-full text-center px-16 gap-8">
      <div className="review-fade-in" style={{ animationDelay: '0.1s' }}>
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 mb-2">Este mês</p>
        <p className="text-7xl md:text-8xl font-black text-white tracking-tight">
          {fmt(recebido)}
        </p>
        <p className="text-lg text-white/50 mt-1">recebido em caixa</p>
      </div>

      <div className="review-slide-up flex gap-6 md:gap-12" style={{ animationDelay: '0.5s' }}>
        <div className="text-center">
          <p className="text-3xl font-bold text-amber-400">{fmt(porReceber)}</p>
          <p className="text-xs text-white/50 mt-1">faturado por receber</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <p className="text-3xl font-bold text-red-400">{porFaturar}</p>
          <p className="text-xs text-white/50 mt-1">serviços por faturar</p>
        </div>
        {trend !== null && (
          <>
            <div className="w-px bg-white/10" />
            <div className="text-center">
              <p className={cn('text-3xl font-bold', Number(trend) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {Number(trend) >= 0 ? '+' : ''}{trend}%
              </p>
              <p className="text-xs text-white/50 mt-1">vs mês anterior</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChapterOperacional({ metrics }: { metrics: any }) {
  const open = useCountUp(metrics?.open_services ?? 0);
  const stuck = useCountUp(metrics?.stuck_services_5d ?? 0);
  const semTecnico = useCountUp(metrics?.sem_tecnico ?? 0);

  return (
    <div className="review-chapter flex flex-col items-center justify-center h-full text-center px-16 gap-10">
      <div className="review-fade-in" style={{ animationDelay: '0.1s' }}>
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 mb-2">Em curso agora</p>
        <p className="text-8xl font-black text-white">{open}</p>
        <p className="text-lg text-white/50 mt-1">serviços em aberto</p>
      </div>

      <div className="review-slide-up flex gap-10" style={{ animationDelay: '0.6s' }}>
        <div className="text-center">
          <div className={cn('text-4xl font-bold mb-1', stuck > 0 ? 'text-amber-400' : 'text-emerald-400')}>
            {stuck}
          </div>
          <p className="text-xs text-white/50">parados +5 dias</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <div className={cn('text-4xl font-bold mb-1', semTecnico > 0 ? 'text-red-400' : 'text-emerald-400')}>
            {semTecnico}
          </div>
          <p className="text-xs text-white/50">sem técnico</p>
        </div>
      </div>
    </div>
  );
}

function ChapterComercial({ metrics }: { metrics: any }) {
  const orcCount = useCountUp(metrics?.orcamentos_pendentes_count ?? 0);
  const orcValor = useCountUp(metrics?.orcamentos_pendentes_valor ?? 0);
  const convRate = useCountUp(metrics?.budget_conversion_rate ?? 0);

  return (
    <div className="review-chapter flex flex-col items-center justify-center h-full text-center px-16 gap-10">
      <div className="review-fade-in" style={{ animationDelay: '0.1s' }}>
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 mb-2">Orçamentos pendentes</p>
        <p className="text-8xl font-black text-white">{orcCount}</p>
        <p className="text-2xl font-semibold text-blue-300 mt-2">{fmt(orcValor)} em aberto</p>
      </div>

      <div className="review-slide-up" style={{ animationDelay: '0.6s' }}>
        <div className="review-dial inline-flex flex-col items-center">
          <div className="text-6xl font-black text-emerald-400">{convRate}%</div>
          <p className="text-sm text-white/50 mt-1">taxa de conversão (30d)</p>
        </div>
      </div>
    </div>
  );
}

function ChapterEquipa({ team }: { team: any[] }) {
  const sorted = [...team].sort((a, b) => b.completed - a.completed).slice(0, 5);

  return (
    <div className="review-chapter flex flex-col justify-center h-full px-12 md:px-24 gap-6">
      <div className="review-fade-in" style={{ animationDelay: '0.1s' }}>
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 mb-1">Equipa</p>
        <h2 className="text-3xl font-bold text-white">Resultados individuais</h2>
      </div>

      <div className="space-y-4">
        {sorted.map((t, i) => {
          const maxCompleted = sorted[0]?.completed || 1;
          const pctBar = Math.round((t.completed / maxCompleted) * 100);
          return (
            <div
              key={t.technician_name}
              className="review-slide-up"
              style={{ animationDelay: `${0.25 + i * 0.12}s` }}
            >
              <div className="flex items-center gap-4 mb-1">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: t.technician_color ?? '#94a3b8' }}
                />
                <span className="text-base font-semibold text-white flex-1">{t.technician_name}</span>
                <span className="text-sm text-white/60">{t.completed} concluídos</span>
                <span className="text-sm font-semibold text-emerald-400 w-24 text-right">
                  {fmt(t.revenue_generated)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden ml-7">
                <div
                  className="h-full rounded-full review-bar"
                  style={{
                    width: `${pctBar}%`,
                    background: t.technician_color ?? '#3b82f6',
                    animationDelay: `${0.4 + i * 0.12}s`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChapterAlertas({ metrics }: { metrics: any }) {
  const alerts: { label: string; value: string; urgent: boolean }[] = [];

  if (metrics) {
    if (metrics.por_faturar_count > 0)
      alerts.push({ label: 'Serviços concluídos sem preço', value: `${metrics.por_faturar_count} serviços`, urgent: true });
    if (metrics.stuck_services_5d > 0)
      alerts.push({ label: 'Serviços parados há +5 dias', value: `${metrics.stuck_services_5d}`, urgent: true });
    if (metrics.faturado_por_receber > 0)
      alerts.push({ label: 'Valor por cobrar', value: fmt(metrics.faturado_por_receber), urgent: false });
    if (metrics.sem_tecnico > 0)
      alerts.push({ label: 'Serviços sem técnico', value: `${metrics.sem_tecnico}`, urgent: true });
    if (metrics.orcamentos_pendentes_count > 0)
      alerts.push({ label: 'Orçamentos a aguardar resposta', value: `${metrics.orcamentos_pendentes_count}`, urgent: false });
  }

  if (alerts.length === 0) {
    return (
      <div className="review-chapter flex flex-col items-center justify-center h-full text-center">
        <div className="review-fade-in text-6xl mb-4">✅</div>
        <div className="review-slide-up" style={{ animationDelay: '0.3s' }}>
          <p className="text-2xl font-bold text-emerald-400">Tudo em ordem</p>
          <p className="text-white/50 mt-2">Sem alertas críticos neste momento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-chapter flex flex-col justify-center h-full px-12 md:px-24 gap-6">
      <div className="review-fade-in" style={{ animationDelay: '0.1s' }}>
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 mb-1">Requer atenção</p>
        <h2 className="text-3xl font-bold text-white">{alerts.length} ponto{alerts.length > 1 ? 's' : ''} de acção</h2>
      </div>
      <div className="space-y-3">
        {alerts.map((a, i) => (
          <div
            key={a.label}
            className={cn(
              'review-slide-up flex items-center justify-between rounded-xl px-5 py-4 border',
              a.urgent
                ? 'bg-red-950/50 border-red-800/50 text-red-300'
                : 'bg-amber-950/50 border-amber-800/50 text-amber-300'
            )}
            style={{ animationDelay: `${0.3 + i * 0.1}s` }}
          >
            <span className="text-base font-medium">{a.label}</span>
            <span className="text-xl font-bold">{a.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChapterPrevisao({ metrics }: { metrics: any }) {
  const pipeline = metrics
    ? metrics.orcamentos_pendentes_valor + metrics.faturado_por_receber
    : 0;
  const pipelineCount = metrics ? useCountUp(pipeline) : 0;

  return (
    <div className="review-chapter flex flex-col items-center justify-center h-full text-center px-16 gap-10">
      <div className="review-fade-in" style={{ animationDelay: '0.1s' }}>
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 mb-2">Potencial identificado</p>
        <p className="text-7xl md:text-8xl font-black text-blue-300">{fmt(pipelineCount)}</p>
        <p className="text-lg text-white/50 mt-2">pipeline financeiro (orçamentos + por cobrar)</p>
      </div>

      <div className="review-slide-up flex gap-8" style={{ animationDelay: '0.6s' }}>
        <div className="text-center">
          <p className="text-sm text-white/40 mb-1">Clientes novos este mês</p>
          <p className="text-3xl font-bold text-white">{metrics?.clientes_novos_mes ?? '—'}</p>
        </div>
        <div className="w-px bg-white/10" />
        <div className="text-center">
          <p className="text-sm text-white/40 mb-1">Ticket médio (30d)</p>
          <p className="text-3xl font-bold text-white">
            {metrics?.avg_ticket ? fmt(metrics.avg_ticket) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewMode({ open, onClose }: ReviewModeProps) {
  const [chapter, setChapter] = useState(0);
  const [paused, setPaused] = useState(false);
  const [entering, setEntering] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const { data: metrics } = useBusinessHealth();
  const { data: team = [] } = useTeamPerformance();

  const totalChapters = CHAPTERS.length;

  const goTo = useCallback((idx: number) => {
    setEntering(false);
    setTimeout(() => {
      setChapter(idx);
      setEntering(true);
    }, 350);
  }, []);

  const next = useCallback(() => {
    if (chapter < totalChapters - 1) goTo(chapter + 1);
  }, [chapter, totalChapters, goTo]);

  const prev = useCallback(() => {
    if (chapter > 0) goTo(chapter - 1);
  }, [chapter, goTo]);

  // Auto-advance
  useEffect(() => {
    if (!open || paused) return;
    timerRef.current = setTimeout(() => {
      if (chapter < totalChapters - 1) next();
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, paused, chapter, next, totalChapters]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); setPaused(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, next, prev, onClose]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setChapter(0);
      setEntering(true);
      setPaused(false);
    }
  }, [open]);

  if (!open) return null;

  const renderChapter = () => {
    switch (CHAPTERS[chapter].id) {
      case 'saude':      return <ChapterSaude metrics={metrics} />;
      case 'operacional': return <ChapterOperacional metrics={metrics} />;
      case 'comercial':  return <ChapterComercial metrics={metrics} />;
      case 'equipa':     return <ChapterEquipa team={team} />;
      case 'alertas':    return <ChapterAlertas metrics={metrics} />;
      case 'previsao':   return <ChapterPrevisao metrics={metrics} />;
      default: return null;
    }
  };

  return (
    <div className="review-overlay fixed inset-0 z-[200] flex flex-col" aria-modal="true">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-[#050d1a]">
        <div
          className="absolute inset-0 opacity-30 transition-all duration-1000"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 40%, var(--review-accent, #1e3a5f) 0%, transparent 70%)`,
          }}
        />
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-3">
        {/* Chapter pills */}
        <div className="flex gap-1.5">
          {CHAPTERS.map((c, i) => (
            <button
              key={c.id}
              onClick={() => goTo(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === chapter ? 'w-8 bg-white' : 'w-4 bg-white/25 hover:bg-white/50'
              )}
              aria-label={c.label}
            />
          ))}
        </div>

        {/* Chapter title */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <span className="text-base">{CHAPTERS[chapter].icon}</span>
          <span className="text-sm font-semibold text-white/70 tracking-wide">{CHAPTERS[chapter].label}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused(p => !p)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label={paused ? 'Avançar automaticamente' : 'Pausar'}
          >
            {paused ? <Play className="h-3.5 w-3.5 text-white" /> : <Pause className="h-3.5 w-3.5 text-white" />}
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!paused && (
        <div className="relative z-10 h-px bg-white/10 mx-6">
          <div
            key={`progress-${chapter}`}
            className="review-progress-bar h-full bg-white/60"
            style={{ animationDuration: `${AUTO_ADVANCE_MS}ms` }}
          />
        </div>
      )}

      {/* Chapter content */}
      <div
        className={cn(
          'relative z-10 flex-1 transition-all duration-350',
          entering ? 'review-chapter-enter' : 'review-chapter-exit'
        )}
      >
        {renderChapter()}
      </div>

      {/* Bottom navigation */}
      <div className="relative z-10 flex items-center justify-between px-6 pb-6 pt-4">
        <button
          onClick={prev}
          disabled={chapter === 0}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {chapter > 0 ? CHAPTERS[chapter - 1].label : ''}
        </button>

        <span className="text-xs text-white/30 tabular-nums">
          {chapter + 1} / {totalChapters}
        </span>

        <button
          onClick={next}
          disabled={chapter === totalChapters - 1}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
        >
          {chapter < totalChapters - 1 ? CHAPTERS[chapter + 1].label : ''}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
