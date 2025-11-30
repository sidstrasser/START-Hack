'use client';

import React from 'react';

interface Step {
  id: number;
  name: string;
  path: string;
  completed: boolean;
  current: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
}

export default function StepIndicator({ steps }: StepIndicatorProps) {
  return (
    <div className="mb-8 w-full">
      <div className="flex items-center w-full">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step Circle and Label */}
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all flex-shrink-0
                  ${step.completed
                    ? 'bg-green-600 text-white'
                    : step.current
                    ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {step.completed ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium text-center whitespace-nowrap
                  ${step.current ? 'text-blue-600' : step.completed ? 'text-green-600' : 'text-gray-500'}
                `}
              >
                {step.name}
              </span>
            </div>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  h-1 flex-1 mx-2 -mt-6 transition-colors
                  ${step.completed ? 'bg-green-600' : 'bg-gray-200'}
                `}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

