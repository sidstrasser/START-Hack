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
  const progress = (completedCount / actionPoints.length) * 100;

  const handleToggle = (id: number) => {
    const point = actionPoints.find(p => p.id === id);
    if (point && !point.completed) {
      setAnimatingId(id);
      setTimeout(() => setAnimatingId(null), 600);
    }
    onTogglePoint(id);
  };

  return (
    <div className="mx-3 my-2 rounded-lg bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200/60 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggleShow}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-emerald-50/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            {/* Circular progress ring */}
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progress * 0.88} 88`}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            {/* Center icon/count */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold text-emerald-600">
                {completedCount}/{actionPoints.length}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">Action Points</h3>
            <p className="text-[10px] text-emerald-600 font-medium">
              {completedCount === actionPoints.length 
                ? "All complete! 🎉" 
                : `${actionPoints.length - completedCount} remaining`}
            </p>
          </div>
        </div>
        <div className={`p-1 rounded-full bg-emerald-100 transition-transform duration-200 ${showActionPoints ? 'rotate-180' : ''}`}>
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {/* Items list */}
      <div className={`transition-all duration-300 ease-in-out ${
        showActionPoints ? 'max-h-[500px] overflow-y-auto' : 'max-h-0 overflow-hidden'
      }`}>
        <div className="px-3 pb-2 space-y-1.5">
          {actionPoints.map((point, index) => {
            const isAnimating = animatingId === point.id;
            
            return (
              <button
                key={point.id}
                onClick={() => handleToggle(point.id)}
                className={`
                  w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-300 text-left group relative
                  ${point.completed 
                    ? 'bg-emerald-100/80' 
                    : 'bg-white shadow-sm hover:shadow-md border border-gray-100'
                  }
                  ${isAnimating ? 'scale-[1.02] shadow-lg shadow-emerald-200/50' : ''}
                `}
              >
                {/* Step number / Checkbox */}
                <div className={`
                  relative flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center 
                  transition-all duration-300 ease-out font-semibold text-[10px]
                  ${point.completed 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'
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
                      <span className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full animate-[particle-1_0.5s_ease-out_forwards]" />
                      <span className="absolute w-1.5 h-1.5 bg-emerald-300 rounded-full animate-[particle-2_0.5s_ease-out_forwards]" />
                      <span className="absolute w-1.5 h-1.5 bg-emerald-500 rounded-full animate-[particle-3_0.5s_ease-out_forwards]" />
                      <span className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full animate-[particle-4_0.5s_ease-out_forwards]" />
                    </>
                  )}
                </div>
                
                {/* Text */}
                <span className={`
                  flex-1 text-xs transition-all duration-300 leading-snug
                  ${point.completed 
                    ? 'text-emerald-700 line-through decoration-emerald-400' 
                    : 'text-gray-700'
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
