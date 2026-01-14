import { Check } from "lucide-react";

interface ProgressStepsProps {
  currentStep: number;
  steps: string[];
}

export const ProgressSteps = ({ currentStep, steps }: ProgressStepsProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto mb-8 animate-fade-in">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          
          return (
            <div key={index} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`progress-step ${
                    isActive ? 'active' : isCompleted ? 'completed' : 'inactive'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    stepNumber
                  )}
                </div>
                <span className={`mt-2 text-xs font-medium text-center max-w-20 ${
                  isActive ? 'text-primary' : isCompleted ? 'text-secondary' : 'text-muted-foreground'
                }`}>
                  {step}
                </span>
              </div>
              
              {/* Line connector */}
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  isCompleted ? 'bg-secondary' : 'bg-border'
                } transition-colors duration-300`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};