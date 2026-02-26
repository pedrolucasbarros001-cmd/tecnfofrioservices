import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getOnboardingSteps, type OnboardingStepContent } from '@/components/onboarding/onboardingContent';
import type { AppRole } from '@/types/database';

interface OnboardingContextType {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  role: AppRole | null;
  content: OnboardingStepContent[];
  currentStepContent: OnboardingStepContent | null;
  isCompleted: boolean;
  isLoading: boolean;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  restartOnboarding: () => void;
  openOnboarding: () => void;
  closeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, role, profile, loading: authLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const checkingRef = useRef(false);

  const content = getOnboardingSteps(role);
  const totalSteps = content.length;
  const currentStepContent = content[currentStep] || null;

  // Check onboarding status when user logs in
  useEffect(() => {
    if (authLoading || !user || !role || hasCheckedOnboarding || checkingRef.current) {
      if (!authLoading && !user) {
        setIsLoading(false);
      }
      return;
    }
    checkingRef.current = true;

    const checkOnboardingStatus = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, onboarding_step')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching onboarding status:', error);
          setIsCompleted(true);
          setIsLoading(false);
          return;
        }

        const completed = data?.onboarding_completed ?? false;
        const step = data?.onboarding_step ?? 0;

        setIsCompleted(completed);
        setCurrentStep(step < totalSteps ? step : 0);
        setHasCheckedOnboarding(true);

        // Auto-open for new users
        if (!completed) {
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
        setIsCompleted(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user, role, authLoading, totalSteps, hasCheckedOnboarding]);

  // Reset when user logs out
  useEffect(() => {
    if (!user) {
      setIsOpen(false);
      setCurrentStep(0);
      setIsCompleted(true);
      setHasCheckedOnboarding(false);
    }
  }, [user]);

  const saveProgress = useCallback(async (step: number) => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error saving onboarding progress:', error);
    }
  }, [user]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      saveProgress(newStep);
    }
  }, [currentStep, totalSteps, saveProgress]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      saveProgress(newStep);
    }
  }, [currentStep, saveProgress]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_step: totalSteps 
        })
        .eq('user_id', user.id);

      setIsCompleted(true);
      setIsOpen(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, [user, totalSteps]);

  const skipOnboarding = useCallback(async () => {
    await completeOnboarding();
  }, [completeOnboarding]);

  const restartOnboarding = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
    saveProgress(0);
  }, [saveProgress]);

  const openOnboarding = useCallback(() => {
    setCurrentStep(0);
    setIsOpen(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    setIsOpen(false);
    saveProgress(currentStep);
  }, [currentStep, saveProgress]);

  const value: OnboardingContextType = {
    isOpen,
    currentStep,
    totalSteps,
    role,
    content,
    currentStepContent,
    isCompleted,
    isLoading,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    restartOnboarding,
    openOnboarding,
    closeOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
