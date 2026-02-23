import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { AppRole } from '@/types/database';
import {
    getDemoScript,
    type DemoStep,
} from '@/components/onboarding/demoScript';

// ─── Demo Data (fictício, nunca persiste) ──────────────────────────────────
export const DEMO_DATA = {
    customer: {
        id: 'demo-customer-id',
        name: 'João Demo',
        phone: '+351 912 345 678',
        email: 'joao.demo@tecnofrio.pt',
        address: 'Rua das Demos, 42',
        city: 'Lisboa',
    },
    service: {
        id: 'demo-service-id',
        code: 'TF-DEMO',
        appliance_type: 'Ar Condicionado',
        brand: 'Samsung',
        model: 'Wind-Free 12000',
        fault_description: 'Não arrefece e faz barulho',
        status: 'por_fazer',
    },
    technician: {
        id: 'demo-tech-id',
        name: 'André Demo',
        color: '#2B4F84',
    },
    pricing: {
        labor: '45.00',
        part: 'Filtro de Ar',
        partPrice: '12.50',
    },
};

// ─── Context Types ─────────────────────────────────────────────────────────
interface DemoContextType {
    isActive: boolean;
    demoRole: AppRole | null;
    stepIndex: number;
    totalSteps: number;
    currentStep: DemoStep | null;
    demoData: typeof DEMO_DATA;
    startDemo: (role: AppRole) => void;
    nextStep: () => void;
    prevStep: () => void;
    endDemo: () => void;
    // For DemoRunner to signal readiness
    onStepReady: (callback: () => void) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
    const [isActive, setIsActive] = useState(false);
    const [demoRole, setDemoRole] = useState<AppRole | null>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [script, setScript] = useState<DemoStep[]>([]);
    const stepReadyCallbackRef = useRef<(() => void) | null>(null);

    const startDemo = useCallback((role: AppRole) => {
        const steps = getDemoScript(role);
        setScript(steps);
        setDemoRole(role);
        setStepIndex(0);
        setIsActive(true);
    }, []);

    const nextStep = useCallback(() => {
        setStepIndex((prev) => {
            const next = prev + 1;
            if (next >= script.length) {
                setIsActive(false);
                setDemoRole(null);
                return 0;
            }
            return next;
        });
    }, [script.length]);

    const prevStep = useCallback(() => {
        setStepIndex((prev) => Math.max(0, prev - 1));
    }, []);

    const endDemo = useCallback(() => {
        setIsActive(false);
        setDemoRole(null);
        setStepIndex(0);
    }, []);

    const onStepReady = useCallback((callback: () => void) => {
        stepReadyCallbackRef.current = callback;
    }, []);

    const currentStep = script[stepIndex] ?? null;
    const totalSteps = script.length;

    return (
        <DemoContext.Provider
            value={{
                isActive,
                demoRole,
                stepIndex,
                totalSteps,
                currentStep,
                demoData: DEMO_DATA,
                startDemo,
                nextStep,
                prevStep,
                endDemo,
                onStepReady,
            }}
        >
            {children}
        </DemoContext.Provider>
    );
}

export function useDemo() {
    const context = useContext(DemoContext);
    if (!context) throw new Error('useDemo must be used within DemoProvider');
    return context;
}
