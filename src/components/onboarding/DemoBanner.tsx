import { useDemo } from '@/contexts/DemoContext';
import { X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
    dono: 'Dono / Administrador',
    secretaria: 'Secretária',
    tecnico: 'Técnico',
};

export function DemoBanner() {
    const { isActive, demoRole, stepIndex, totalSteps, endDemo } = useDemo();

    if (!isActive || !demoRole) return null;

    const progress = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

    return (
        <div
            data-demo-banner=""
            className="fixed top-0 left-0 right-0 z-[10000] flex flex-col"
            style={{ pointerEvents: 'auto' }}
        >
            {/* Main banner */}
            <div className="flex items-center gap-3 px-4 py-2 bg-[#2B4F84] text-white shadow-lg">
                <div className="flex items-center gap-2 shrink-0">
                    <GraduationCap className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                        Modo Demo
                    </span>
                </div>

                <div className="h-4 w-px bg-white/30" />

                <span className="text-xs text-white/80 truncate">
                    {ROLE_LABELS[demoRole] ?? demoRole}
                </span>

                <div className="flex-1" />

                <span className="text-xs text-white/60 shrink-0">
                    Passo {stepIndex + 1} / {totalSteps}
                </span>

                <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                        'h-7 px-2 text-xs text-white/80 hover:text-white hover:bg-white/20',
                        'shrink-0',
                    )}
                    onClick={endDemo}
                >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Sair Demo
                </Button>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-white/20 relative overflow-hidden">
                <div
                    className="absolute inset-y-0 left-0 bg-white transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
