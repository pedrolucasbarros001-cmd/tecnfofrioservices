import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { GuidedTourOverlay } from './GuidedTourOverlay';
import { GuidedTourTooltip } from './GuidedTourTooltip';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuidedTour() {
  const {
    isOpen,
    currentStep,
    totalSteps,
    currentStepContent,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    closeOnboarding,
  } = useOnboarding();

  const navigate = useNavigate();
  const location = useLocation();
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Lock body scroll when tour is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOnboarding();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnboarding]);

  const updateTargetRect = useCallback((selector: string) => {
    const el = document.querySelector(selector);
    if (!el) {
      setTargetRect(null);
      return false;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });

    // Observe resize
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    });
    observerRef.current.observe(el);

    return true;
  }, []);

  // Navigate and find element when step changes
  useEffect(() => {
    if (!isOpen || !currentStepContent) return;

    // Clean up previous polling
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const { tourSelector, page } = currentStepContent;

    // No selector = central card mode
    if (!tourSelector) {
      setTargetRect(null);
      setIsNavigating(false);
      return;
    }

    // Need to navigate to a different page?
    if (page && location.pathname !== page) {
      setIsNavigating(true);
      setTargetRect(null);
      navigate(page);
      return; // Will re-trigger when location changes
    }

    // Try to find element immediately
    if (updateTargetRect(tourSelector)) {
      setIsNavigating(false);
      return;
    }

    // Poll for element (after navigation or lazy render)
    setIsNavigating(true);
    let attempts = 0;
    pollRef.current = setInterval(() => {
      attempts++;
      if (updateTargetRect(tourSelector)) {
        setIsNavigating(false);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      } else if (attempts > 20) {
        // Timeout after 2s - show as central card
        setTargetRect(null);
        setIsNavigating(false);
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 100);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [isOpen, currentStep, currentStepContent, location.pathname, navigate, updateTargetRect]);

  // Also update on scroll
  useEffect(() => {
    if (!isOpen || !currentStepContent?.tourSelector) return;
    
    const handleScroll = () => {
      if (currentStepContent.tourSelector) {
        updateTargetRect(currentStepContent.tourSelector);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen, currentStepContent, updateTargetRect]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep === totalSteps - 1) {
      completeOnboarding();
    } else {
      nextStep();
    }
  }, [currentStep, totalSteps, completeOnboarding, nextStep]);

  const handlePrev = useCallback(() => {
    prevStep();
  }, [prevStep]);

  if (!isOpen || !currentStepContent || isNavigating) {
    // Still show overlay if navigating
    if (isOpen && isNavigating) {
      return <GuidedTourOverlay targetRect={null} />;
    }
    return null;
  }

  return (
    <>
      <GuidedTourOverlay
        targetRect={targetRect}
        onClick={closeOnboarding}
      />
      <GuidedTourTooltip
        step={currentStepContent}
        currentStep={currentStep}
        totalSteps={totalSteps}
        targetRect={targetRect}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={skipOnboarding}
        isFirst={currentStep === 0}
        isLast={currentStep === totalSteps - 1}
      />
    </>
  );
}
