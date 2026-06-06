'use client';

import { useState } from 'react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { StepIndicator } from '@/components/shared/StepIndicator';
import { UploadStep } from '@/components/upload/UploadStep';
import { VectorizeStep } from '@/components/vectorize/VectorizeStep';
import { ColorEditStep } from '@/components/colors/ColorEditStep';
import { LabelStep } from '@/components/labels/LabelStep';

type Step = 'upload' | 'vectorize' | 'colors' | 'labels';

const STEPS: Step[] = ['upload', 'vectorize', 'colors', 'labels'];

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [svgString, setSvgString] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(currentStep);

  const goToStep = (idx: number) => {
    // Only allow navigating to steps that have data
    if (idx === 0) { setCurrentStep('upload'); return; }
    if (idx === 1 && imageData) { setCurrentStep('vectorize'); return; }
    if (idx === 2 && svgString) { setCurrentStep('colors'); return; }
    if (idx === 3 && svgString) { setCurrentStep('labels'); return; }
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <StepIndicator
          currentStep={stepIndex}
          totalSteps={4}
          onStepClick={goToStep}
        />

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-10">
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
              className="text-sm text-gray-500 hover:text-gray-800 transition"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
