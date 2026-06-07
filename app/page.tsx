'use client';

import { useState } from 'react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { StepIndicator } from '@/components/shared/StepIndicator';
import { UploadStep } from '@/components/upload/UploadStep';
import { VectorizeStep } from '@/components/vectorize/VectorizeStep';
import { ColorEditStep } from '@/components/colors/ColorEditStep';
import { ShapeEditStep } from '@/components/shape/ShapeEditStep';
import { LabelStep } from '@/components/labels/LabelStep';
import { useI18n } from '@/lib/i18n';

type Step = 'upload' | 'vectorize' | 'colors' | 'shape' | 'labels';

const STEPS: Step[] = ['upload', 'vectorize', 'colors', 'shape', 'labels'];

export default function Home() {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [svgString, setSvgString] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(currentStep);

  const goToStep = (idx: number) => {
    // Only allow navigating to steps that have data
    if (idx === 0) { setCurrentStep('upload'); return; }
    if (idx === 1 && imageData) { setCurrentStep('vectorize'); return; }
    if (idx === 2 && svgString) { setCurrentStep('colors'); return; }
    if (idx === 3 && svgString) { setCurrentStep('shape'); return; }
    if (idx === 4 && svgString) { setCurrentStep('labels'); return; }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <StepIndicator
          currentStep={stepIndex}
          totalSteps={5}
          onStepClick={goToStep}
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-10 dark:bg-gray-800 dark:border-gray-700">
          {currentStep === 'upload' && (
            <UploadStep
              onUploadComplete={(data) => {
                setImageData(data);
                setCurrentStep('vectorize');
              }}
            />
          )}

          {currentStep === 'vectorize' && imageData && (
            <VectorizeStep
              imageData={imageData}
              onVectorizeComplete={(svg) => {
                setSvgString(svg);
                setCurrentStep('colors');
              }}
            />
          )}

          {currentStep === 'colors' && svgString && (
            <ColorEditStep
              svgString={svgString}
              onColorsEdited={(svg) => {
                setSvgString(svg);
                setCurrentStep('shape');
              }}
            />
          )}

          {currentStep === 'shape' && svgString && (
            <ShapeEditStep
              svgString={svgString}
              onComplete={(svg) => {
                setSvgString(svg);
                setCurrentStep('labels');
              }}
            />
          )}

          {currentStep === 'labels' && svgString && (
            <LabelStep
              svgString={svgString}
              onComplete={(svg) => setSvgString(svg)}
            />
          )}
        </div>

        {stepIndex > 0 && (
          <div className="text-center">
            <button
              onClick={() => goToStep(stepIndex - 1)}
              className="text-sm text-gray-500 hover:text-gray-800 transition dark:text-gray-400 dark:hover:text-gray-200"
            >
              {t('nav.back')}
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
