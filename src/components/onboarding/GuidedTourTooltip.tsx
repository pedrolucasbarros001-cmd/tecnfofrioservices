import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingProgress } from './OnboardingProgress';
import { cn } from '@/lib/utils';
import type { OnboardingStepContent } from './onboardingContent';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GuidedTourTooltipProps {
  step: OnboardingStepContent;
  currentStep: number;
  totalSteps: number;
  targetRect: TargetRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirst: boolean;
  isLast: boolean;
}

type Position = 'bottom' | 'top' | 'right' | 'left';

function computePosition(targetRect: TargetRect, tooltipW: number, tooltipH: number): { position: Position; top: number; left: number } {
  const gap = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 8;

  const tTop = targetRect.top - pad;
  const tLeft = targetRect.left - pad;
  const tWidth = targetRect.width + pad * 2;
  const tHeight = targetRect.height + pad * 2;

  const spaceBelow = vh - (tTop + tHeight);
  const spaceAbove = tTop;
  const spaceRight = vw - (tLeft + tWidth);
  const spaceLeft = tLeft;

  let pos: Position = 'bottom';
  if (spaceBelow >= tooltipH + gap) {
    pos = 'bottom';
  } else if (spaceRight >= tooltipW + gap) {
    pos = 'right';
  } else if (spaceLeft >= tooltipW + gap) {
    pos = 'left';
  } else if (spaceAbove >= tooltipH + gap) {
    pos = 'top';
  } else {
    pos = 'bottom';
  }

  let top = 0;
  let left = 0;

  switch (pos) {
    case 'bottom':
      top = tTop + tHeight + gap;
      left = tLeft + tWidth / 2 - tooltipW / 2;
      break;
    case 'top':
      top = tTop - tooltipH - gap;
      left = tLeft + tWidth / 2 - tooltipW / 2;
      break;
    case 'right':
      top = tTop + tHeight / 2 - tooltipH / 2;
      left = tLeft + tWidth + gap;
      break;
    case 'left':
      top = tTop + tHeight / 2 - tooltipH / 2;
      left = tLeft - tooltipW - gap;
      break;
  }

  left = Math.max(12, Math.min(left, vw - tooltipW - 12));
  top = Math.max(12, Math.min(top, vh - tooltipH - 12));

  return { position: pos, top, left };
}

export function GuidedTourTooltip({
  step,
  currentStep,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
}: GuidedTourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => {
      clearTimeout(timer);
      setIsVisible(false);
    };
  }, [currentStep]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (!tooltipRef.current) return;

      // Mobile with spotlight: bottom sheet
      if (isMobile && targetRect) {
        setStyle({
          position: 'fixed',
          bottom: '0px',
          left: '0px',
          right: '0px',
          top: 'auto',
          transform: 'none',
          zIndex: 9999,
        });
        return;
      }

      const tooltipW = tooltipRef.current.offsetWidth;
      const tooltipH = tooltipRef.current.offsetHeight;

      if (!targetRect) {
        // Center on screen
        setStyle({
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
        });
      } else {
        const { top, left } = computePosition(targetRect, tooltipW, tooltipH);
        setStyle({
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          transform: 'none',
          zIndex: 9999,
        });
      }
    };

    requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [targetRect, currentStep, isMobile]);

  const Icon = step.fallbackIcon;
  const isWelcomeOrFinal = step.id.includes('welcome') || step.id.includes('final');
  const isCentralCard = !targetRect;
  const isMobileBottomSheet = isMobile && targetRect;

  return (
    <div
      ref={tooltipRef}
      style={style}
      className={cn(
        'bg-background shadow-2xl border border-border/50 overflow-hidden transition-all duration-300',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        isMobileBottomSheet
          ? 'w-full max-h-[60vh] overflow-y-auto rounded-t-xl'
          : 'w-[90vw] max-w-[420px] rounded-xl',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with icon/logo for central cards */}
      {isCentralCard && (
        <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 pt-8 pb-6">
          <div className="flex flex-col items-center justify-center">
            {isWelcomeOrFinal ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={tecnofrioLogoIcon}
                  alt="TECNOFRIO"
                  className="h-16 w-16 object-contain"
                />
                <div className="text-center">
                  <span className="text-xl font-bold text-[#2B4F84]">TECNO</span>
                  <span className="text-xl font-bold text-foreground">FRIO</span>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                <div className="relative bg-gradient-to-br from-primary to-primary/80 p-5 rounded-2xl shadow-lg">
                  <Icon className="h-10 w-10 text-primary-foreground" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className={cn(
        'pb-2',
        isMobileBottomSheet ? 'px-4 pt-4' : 'px-5 pt-4',
        isCentralCard ? '' : isMobileBottomSheet ? 'pt-4' : 'pt-5',
      )}>
        {/* Step indicator for spotlight mode */}
        {!isCentralCard && (
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Passo {currentStep + 1} de {totalSteps}
            </span>
          </div>
        )}

        <h3 className={cn(
          'font-semibold text-foreground',
          isCentralCard ? 'text-lg text-center' : 'text-base'
        )}>
          {step.title}
        </h3>

        <p className={cn(
          'text-muted-foreground text-sm leading-relaxed mt-2',
          isCentralCard && 'text-center'
        )}>
          {step.description}
        </p>

        {/* Bullet points */}
        {step.details.length > 0 && (
          <ul className={cn(
            'mt-3 space-y-1.5 overflow-y-auto',
            isMobileBottomSheet ? 'max-h-[120px]' : 'max-h-[180px]',
          )}>
            {step.details.map((detail, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Progress */}
      <div className={cn('py-2', isMobileBottomSheet ? 'px-4' : 'px-5')}>
        <OnboardingProgress current={currentStep} total={totalSteps} />
      </div>

      {/* Actions */}
      <div className={cn(
        'pb-4 flex items-center justify-between gap-3',
        isMobileBottomSheet ? 'px-4 pb-[max(1rem,env(safe-area-inset-bottom))]' : 'px-5',
      )}>
        <div className="flex-1">
          {isFirst ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground min-h-[44px]"
            >
              Saltar guia
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              className="text-muted-foreground hover:text-foreground min-h-[44px]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
          )}
        </div>
        <div className="flex-1 flex justify-end">
          <Button onClick={onNext} size="sm" className="min-w-[120px] min-h-[44px]">
            {isLast ? (
              'Começar a usar'
            ) : (
              <>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
