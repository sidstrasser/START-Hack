"use client";

import { useState } from "react";

interface ActionPoint {
  id: number;
  text: string;
  completed: boolean;
  recommended?: boolean;
}

interface ActionPointsChecklistProps {
  actionPoints: ActionPoint[];
  showActionPoints: boolean;
  onToggleShow: () => void;
  onTogglePoint: (id: number) => void;
}

export default function ActionPointsChecklist({
  actionPoints,
  showActionPoints,
  onToggleShow,
  onTogglePoint,
}: ActionPointsChecklistProps) {
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const completedCount = actionPoints.filter(p => p.completed).length;
  const progress = actionPoints.length > 0 ? (completedCount / actionPoints.length) * 100 : 0;

  const handleToggle = (id: number) => {
    const point = actionPoints.find(p => p.id === id);
    if (point && !point.completed) {
      setAnimatingId(id);
      setTimeout(() => setAnimatingId(null), 600);
    }
    onTogglePoint(id);
  };

  return (
    <div className="mx-3 my-3 rounded-ds-lg bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggleShow}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Circular progress ring */}
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#7B5BF1"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progress * 0.88} 88`}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            {/* Center count */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-ds-accent-2">
                {completedCount}/{actionPoints.length}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Action Points</h3>
            <p className="text-[11px] text-white/50">
              {completedCount === actionPoints.length && actionPoints.length > 0
                ? "All complete!" 
                : `${actionPoints.length - completedCount} remaining`}
            </p>
          </div>
        </div>
        <div className={`p-1.5 rounded-full bg-white/10 transition-transform duration-200 ${showActionPoints ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {/* Items list */}
      <div className={`transition-all duration-300 ease-in-out ${
        showActionPoints ? 'max-h-[400px] overflow-y-auto' : 'max-h-0 overflow-hidden'
      }`}>
        <div className="px-3 pb-3 space-y-2">
          {actionPoints.map((point, index) => {
            const isAnimating = animatingId === point.id;
            
            return (
              <button
                key={point.id}
                onClick={() => handleToggle(point.id)}
                className={`
                  w-full flex items-start gap-3 px-3 py-2.5 rounded-ds-md transition-all duration-300 text-left group relative
                  ${point.completed 
                    ? 'bg-ds-accent-2/10 border border-ds-accent-2/20' 
                    : 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                  }
                  ${isAnimating ? 'scale-[1.02] shadow-lg shadow-ds-accent-2/20' : ''}
                `}
              >
                {/* Step number / Checkbox */}
                <div className={`
                  relative flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center 
                  transition-all duration-300 ease-out font-semibold text-[10px]
                  ${point.completed 
                    ? 'bg-ds-accent-2 text-white' 
                    : 'bg-white/10 text-white/50 group-hover:bg-ds-accent-2/20 group-hover:text-ds-accent-2'
                  }
                  ${isAnimating ? 'animate-[checkbox-pop_0.4s_ease-out]' : ''}
                `}>
                  {point.completed ? (
                    <svg 
                      className="w-3.5 h-3.5"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={3} 
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span>{index + 1}</span>
                  )}
                  
                  {/* Success particles */}
                  {isAnimating && (
                    <>
                      <span className="absolute w-1.5 h-1.5 bg-ds-accent-2 rounded-full animate-[particle-1_0.5s_ease-out_forwards]" />
                      <span className="absolute w-1.5 h-1.5 bg-ds-accent-2/70 rounded-full animate-[particle-2_0.5s_ease-out_forwards]" />
                      <span className="absolute w-1.5 h-1.5 bg-ds-accent-1 rounded-full animate-[particle-3_0.5s_ease-out_forwards]" />
                      <span className="absolute w-1.5 h-1.5 bg-white rounded-full animate-[particle-4_0.5s_ease-out_forwards]" />
                    </>
                  )}
                </div>
                
                {/* Text */}
                <span className={`
                  flex-1 text-xs transition-all duration-300 leading-snug pt-0.5
                  ${point.completed 
                    ? 'text-ds-accent-2 line-through decoration-ds-accent-2/50' 
                    : 'text-white/80'
                  }
                `}>
                  {point.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes checkbox-pop {
          0% { transform: scale(1); }
          30% { transform: scale(1.4); }
          50% { transform: scale(0.9); }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes particle-1 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-16px, -16px) scale(0); opacity: 0; }
        }
        @keyframes particle-2 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(16px, -14px) scale(0); opacity: 0; }
        }
        @keyframes particle-3 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-14px, 16px) scale(0); opacity: 0; }
        }
        @keyframes particle-4 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(16px, 14px) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
