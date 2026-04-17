import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';
import { GuidedTourOverlay } from './GuidedTourOverlay';
import { DemoTooltip } from './DemoTooltip';
import { DemoBanner } from './DemoBanner';

interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

export function DemoRunner() {
    const {
        isActive,
        stepIndex,
        totalSteps,
        currentStep,
        nextStep,
    } = useDemo();

    const navigate = useNavigate();
    const location = useLocation();
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);
    const [hasPendingClick, setHasPendingClick] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const observerRef = useRef<ResizeObserver | null>(null);
    const mutationRef = useRef<MutationObserver | null>(null);
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Body padding so page content is not hidden behind the banner (56px = banner height)
    useEffect(() => {
        if (isActive) {
            document.body.style.paddingTop = '48px';
            document.body.classList.add('demo-active');
        }
        return () => {
            document.body.style.paddingTop = '';
            document.body.classList.remove('demo-active');
        };
    }, [isActive]);

    const clearPolling = useCallback(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        if (observerRef.current) { observerRef.current.disconnect(); }
        if (mutationRef.current) { mutationRef.current.disconnect(); }
        if (clickTimeoutRef.current) { clearTimeout(clickTimeoutRef.current); clickTimeoutRef.current = null; }
    }, []);

    const findAndObserve = useCallback((selector: string): boolean => {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) { setTargetRect(null); return false; }

        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });

        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new ResizeObserver(() => {
            const rect = el.getBoundingClientRect();
            setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
        });
        observerRef.current.observe(el);
        return true;
    }, []);

    const pollForElement = useCallback((selector: string, onFound?: () => void) => {
        let attempts = 0;
        setIsNavigating(true);
        pollRef.current = setInterval(() => {
            attempts++;
            if (findAndObserve(selector)) {
                setIsNavigating(false);
                if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                onFound?.();
            } else if (attempts > 50) {
                // Timeout after 5s — show as central card without highlight
                setTargetRect(null);
                setIsNavigating(false);
                if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            }
        }, 100);
    }, [findAndObserve]);

    useEffect(() => {
        if (!isActive || !currentStep) return;

        clearPolling();
        setHasPendingClick(false);

        const { type, selector, route, autoClickSelector, waitForSelector } = currentStep;

        // ── Navigate step ──────────────────────────────────────────────────────
        if (type === 'navigate') {
            setTargetRect(null);
            if (route && location.pathname !== route) {
                setIsNavigating(true);
                navigate(route);
                // Auto-advance after navigation settles
                clickTimeoutRef.current = setTimeout(() => {
                    setIsNavigating(false);
                    nextStep();
                }, 800);
            } else {
                // Already on the right page — just advance
                clickTimeoutRef.current = setTimeout(() => nextStep(), 200);
            }
            return;
        }

        // ── Explain step (central card — no highlight) ─────────────────────────
        if (type === 'explain') {
            setTargetRect(null);
            setIsNavigating(false);
            return;
        }

        // ── Navigate to page first if needed ──────────────────────────────────
        if (currentStep.route && location.pathname !== currentStep.route) {
            setIsNavigating(true);
            setTargetRect(null);
            navigate(currentStep.route);
            return; // Re-triggers after location change
        }

        setIsNavigating(false);

        // ── waitForSelector: wait for a specific element to appear ───────────
        if (waitForSelector) {
            setTargetRect(null);
            let attempts = 0;
            pollRef.current = setInterval(() => {
                attempts++;
                const el = document.querySelector(waitForSelector) as HTMLElement | null;
                if (el) {
                    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                    if (selector) {
                        if (!findAndObserve(selector)) {
                            pollForElement(selector);
                        }
                    }
                } else if (attempts > 50) {
                    // 5s timeout — show central card
                    setTargetRect(null);
                    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                }
            }, 100);
            return;
        }

        // ── Highlight step ────────────────────────────────────────────────────
        if (selector) {
            if (!findAndObserve(selector)) {
                pollForElement(selector);
            }
        } else {
            setTargetRect(null);
        }

        // ── Auto-click (click step): click element then wait for next element ─
        if (type === 'click' && autoClickSelector) {
            setHasPendingClick(true);
            clickTimeoutRef.current = setTimeout(() => {
                const el = document.querySelector(autoClickSelector) as HTMLElement | null;
                if (el) {
                    el.click();
                    setHasPendingClick(false);
                }
            }, 600);
        } else if (autoClickSelector) {
            // Highlight step with auto-click — click after a tiny delay, then wait for user to read
            clickTimeoutRef.current = setTimeout(() => {
                const el = document.querySelector(autoClickSelector) as HTMLElement | null;
                if (el) el.click();
            }, 1200);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, stepIndex, currentStep, location.pathname]);

    // Update rect on scroll
    useEffect(() => {
        if (!isActive || !currentStep?.selector) return;
        const handleScroll = () => {
            if (currentStep?.selector) findAndObserve(currentStep.selector);
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isActive, currentStep, findAndObserve]);

    // Cleanup
    useEffect(() => () => clearPolling(), [clearPolling]);

    if (!isActive) return null;

    const isFirst = stepIndex === 0;
    const isLast = stepIndex === totalSteps - 1;

    return (
        <>
            <DemoBanner />
            {/* Show overlay while highlighting or navigating */}
            {(currentStep?.selector || isNavigating || currentStep?.type === 'explain') && (
                <GuidedTourOverlay targetRect={isNavigating ? null : targetRect} />
            )}
            {/* Tooltip — hide while navigating */}
            {!isNavigating && currentStep && (
                <DemoTooltip
                    step={currentStep}
                    targetRect={targetRect}
                    isFirst={isFirst}
                    isLast={isLast}
                />
            )}
        </>
    );
}
