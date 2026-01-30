import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { OnboardingProgress } from './OnboardingProgress';
import { cn } from '@/lib/utils';
import tecnofrioLogoIcon from '@/assets/tecnofrio-logo-icon.png';

export function OnboardingModal() {
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

  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Handle step transitions with animation
  const handleNext = () => {
    if (currentStep === totalSteps - 1) {
      completeOnboarding();
    } else {
      setSlideDirection('left');
      setIsAnimating(true);
      setTimeout(() => {
        nextStep();
        setIsAnimating(false);
      }, 150);
    }
  };

  const handlePrev = () => {
    setSlideDirection('right');
    setIsAnimating(true);
    setTimeout(() => {
      prevStep();
      setIsAnimating(false);
    }, 150);
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeOnboarding();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeOnboarding]);

  if (!isOpen || !currentStepContent) return null;

  const Icon = currentStepContent.fallbackIcon;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeOnboarding}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 animate-in zoom-in-95 fade-in duration-200">
        <div className="bg-background rounded-2xl shadow-2xl overflow-hidden border border-border/50">
          {/* Close Button */}
          <button
            onClick={closeOnboarding}
            className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-background/80 hover:bg-muted transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Visual Zone - Icon/Image */}
          <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 pt-12 pb-8">
            <div 
              className={cn(
                'flex flex-col items-center justify-center transition-all duration-150',
                isAnimating && slideDirection === 'left' && 'opacity-0 -translate-x-4',
                isAnimating && slideDirection === 'right' && 'opacity-0 translate-x-4',
              )}
            >
              {/* Logo for welcome/final steps */}
              {(currentStepContent.id.includes('welcome') || currentStepContent.id.includes('final')) ? (
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={tecnofrioLogoIcon}
                    alt="TECNOFRIO"
                    className="h-20 w-20 object-contain"
                  />
                  <div className="text-center">
                    <span className="text-2xl font-bold text-[#2B4F84]">TECNO</span>
                    <span className="text-2xl font-bold text-foreground">FRIO</span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                  <div className="relative bg-gradient-to-br from-primary to-primary/80 p-6 rounded-2xl shadow-lg">
                    <Icon className="h-12 w-12 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Zone */}
          <div className="px-6 pt-6 pb-4">
            <div 
              className={cn(
                'space-y-3 transition-all duration-150 min-h-[100px]',
                isAnimating && slideDirection === 'left' && 'opacity-0 -translate-x-4',
                isAnimating && slideDirection === 'right' && 'opacity-0 translate-x-4',
              )}
            >
              <h2 className="text-xl font-semibold text-foreground text-center">
                {currentStepContent.title}
              </h2>
              <p className="text-muted-foreground text-center leading-relaxed">
                {currentStepContent.description}
              </p>
            </div>
          </div>

          {/* Progress Zone */}
          <div className="px-6 py-3">
            <OnboardingProgress current={currentStep} total={totalSteps} />
          </div>

          {/* Actions Zone */}
          <div className="px-6 pb-6 flex items-center justify-between gap-3">
            {/* Left side - Skip or Back */}
            <div className="flex-1">
              {isFirstStep ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipOnboarding}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Saltar guia
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
              )}
            </div>

            {/* Right side - Next or Complete */}
            <div className="flex-1 flex justify-end">
              <Button onClick={handleNext} className="min-w-[140px]">
                {isLastStep ? (
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
      </div>
    </div>
  );
}
