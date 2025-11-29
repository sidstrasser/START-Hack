"use client";

import { useState } from "react";

interface ActionPoint {
  id: number;
  text: string;
  completed: boolean;
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
    <div className="m-3 rounded-xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200/60 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggleShow}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-emerald-50/50 transition-colors"
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
              <span className="text-xs font-bold text-emerald-600">
                {completedCount}/{actionPoints.length}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Action Points</h3>
            <p className="text-xs text-emerald-600 font-medium">
              {completedCount === actionPoints.length 
                ? "All complete! 🎉" 
                : `${actionPoints.length - completedCount} remaining`}
            </p>
          </div>
        </div>
        <div className={`p-1.5 rounded-full bg-emerald-100 transition-transform duration-200 ${showActionPoints ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {/* Items list */}
      <div className={`transition-all duration-300 ease-in-out ${
        showActionPoints ? 'max-h-80 overflow-y-auto' : 'max-h-0 overflow-hidden'
      }`}>
        <div className="px-3 pb-3 space-y-2">
          {actionPoints.map((point, index) => {
            const isAnimating = animatingId === point.id;
            
            return (
              <button
                key={point.id}
                onClick={() => handleToggle(point.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-left group relative
                  ${point.completed 
                    ? 'bg-emerald-100/80 shadow-inner' 
                    : 'bg-white shadow-sm hover:shadow-md hover:scale-[1.01] border border-gray-100'
                  }
                  ${isAnimating ? 'scale-[1.02] shadow-lg shadow-emerald-200/50' : ''}
                `}
              >
                {/* Step number / Checkbox */}
                <div className={`
                  relative flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center 
                  transition-all duration-300 ease-out font-semibold text-xs
                  ${point.completed 
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-300/50' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                  }
                  ${isAnimating ? 'animate-[checkbox-pop_0.4s_ease-out]' : ''}
                `}>
                  {point.completed ? (
                    <svg 
                      className="w-4 h-4"
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
                  flex-1 text-sm transition-all duration-300 leading-snug
                  ${point.completed 
                    ? 'text-emerald-700 line-through decoration-emerald-400 decoration-2' 
                    : 'text-gray-700 group-hover:text-gray-900'
                  }
                `}>
                  {point.text}
                </span>

                {/* Completed badge */}
                {point.completed && (
                  <span className="flex-shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                    DONE
                  </span>
                )}
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
