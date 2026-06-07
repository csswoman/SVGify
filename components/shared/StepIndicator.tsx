'use client';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
}

const STEP_NAMES = ['Upload', 'Vectorize', 'Colors', 'Labels'];

export function StepIndicator({ currentStep, totalSteps, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className="flex items-center">
          <button
            onClick={() => onStepClick?.(i)}
            disabled={i > currentStep}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
              i === currentStep
                ? 'bg-blue-600 text-white'
                : i < currentStep
                ? 'bg-green-600 text-white cursor-pointer'
                : 'bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {i + 1}
          </button>
          {i < totalSteps - 1 && (
            <div className={`w-12 h-1 mx-2 ${i < currentStep ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-700'}`} />
          )}
        </div>
      ))}
      <div className="ml-4 text-sm font-medium text-gray-700 dark:text-gray-300">
        {STEP_NAMES[currentStep] || 'Unknown'}
      </div>
    </div>
  );
}
