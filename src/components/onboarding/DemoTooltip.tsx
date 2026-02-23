import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDemo } from '@/contexts/DemoContext';
import type { DemoStep } from './demoScript';

interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

interface DemoTooltipProps {
    step: DemoStep;
    targetRect: TargetRect | null;
    isFirst: boolean;
    isLast: boolean;
}

type TooltipPosition = 'bottom' | 'top' | 'right' | 'left';

function computePosition(
    targetRect: TargetRect,
    tooltipW: number,
    tooltipH: number,
): { position: TooltipPosition; top: number; left: number } {
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

    let pos: TooltipPosition = 'bottom';
    if (spaceBelow >= tooltipH + gap) pos = 'bottom';
    else if (spaceRight >= tooltipW + gap) pos = 'right';
    else if (spaceLeft >= tooltipW + gap) pos = 'left';
    else if (spaceAbove >= tooltipH + gap) pos = 'top';
    else pos = 'bottom';

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
    top = Math.max(56, Math.min(top, vh - tooltipH - 12)); // 56 = banner height
    return { position: pos, top, left };
}

export function DemoTooltip({ step, targetRect, isFirst, isLast }: DemoTooltipProps) {
    const { nextStep, prevStep, endDemo } = useDemo();
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const isMobileWithTarget = isMobile && !!targetRect;
    const isCentral = !targetRect || step.position === 'center';

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 60);
        return () => { clearTimeout(timer); setIsVisible(false); };
    }, [step.id]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const update = () => {
            if (!tooltipRef.current) return;

            if (isMobileWithTarget) {
                setStyle({ position: 'fixed', bottom: 0, left: 0, right: 0, top: 'auto', transform: 'none', zIndex: 10001 });
                return;
            }

            const tooltipW = tooltipRef.current.offsetWidth;
            const tooltipH = tooltipRef.current.offsetHeight;

            if (!targetRect || isCentral) {
                setStyle({ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10001 });
            } else {
                const { top, left } = computePosition(targetRect, tooltipW, tooltipH);
                setStyle({ position: 'fixed', top: `${top}px`, left: `${left}px`, transform: 'none', zIndex: 10001 });
            }
        };
        requestAnimationFrame(update);
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [targetRect, step.id, isMobile, isCentral, isMobileWithTarget]);

    return (
        <div
            ref={tooltipRef}
            style={style}
            onClick={(e) => e.stopPropagation()}
            className={cn(
                'bg-background border border-border/60 shadow-2xl overflow-hidden transition-all duration-300',
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
                isMobileWithTarget
                    ? 'w-full max-h-[60vh] overflow-y-auto rounded-t-2xl'
                    : 'w-[90vw] max-w-[400px] rounded-2xl',
            )}
        >
            {/* Demo badge */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-0">
                <div className="flex items-center gap-1.5 bg-[#2B4F84]/10 px-2 py-0.5 rounded-full">
                    <GraduationCap className="h-3 w-3 text-[#2B4F84]" />
                    <span className="text-[10px] font-semibold text-[#2B4F84] uppercase tracking-wide">Demo</span>
                </div>
                <div className="flex-1" />
                <button
                    onClick={endDemo}
                    className="p-1 rounded-full hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Central card icon zone */}
            {isCentral && (
                <div className="flex justify-center pt-4 pb-2">
                    <div className="bg-gradient-to-br from-[#2B4F84]/10 to-[#2B4F84]/5 border border-[#2B4F84]/20 p-4 rounded-2xl">
                        <GraduationCap className="h-10 w-10 text-[#2B4F84]" />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="px-4 pt-3 pb-2">
                <h3 className={cn(
                    'font-semibold text-foreground leading-tight',
                    isCentral ? 'text-lg text-center' : 'text-base',
                )}>
                    {step.title}
                </h3>
                <p className={cn(
                    'text-muted-foreground text-sm leading-relaxed mt-2',
                    isCentral && 'text-center',
                )}>
                    {step.description}
                </p>

                {step.details && step.details.length > 0 && (
                    <ul className={cn(
                        'mt-3 space-y-1.5 overflow-y-auto',
                        isMobileWithTarget ? 'max-h-[100px]' : 'max-h-[160px]',
                    )}>
                        {step.details.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="text-[#2B4F84] mt-0.5 shrink-0">•</span>
                                <span>{d}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Actions */}
            <div className={cn(
                'px-4 pb-4 pt-2 flex items-center justify-between gap-3',
                isMobileWithTarget && 'pb-[max(1rem,env(safe-area-inset-bottom))]',
            )}>
                <div className="flex-1">
                    {isFirst ? (
                        <Button variant="ghost" size="sm" onClick={endDemo}
                            className="text-muted-foreground hover:text-foreground min-h-[40px]">
                            Saltar demo
                        </Button>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={prevStep}
                            className="text-muted-foreground hover:text-foreground min-h-[40px]">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Anterior
                        </Button>
                    )}
                </div>

                <div className="flex-1 flex justify-end">
                    <Button
                        size="sm"
                        onClick={nextStep}
                        className="min-w-[110px] min-h-[40px] bg-[#2B4F84] hover:bg-[#2B4F84]/90"
                    >
                        {isLast ? 'Concluir' : (
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
