"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "info";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = "success", onClose, duration = 4000 }: ToastProps) {
  const [stage, setStage] = useState<"enter" | "visible" | "exit">("enter");

  useEffect(() => {
    // Enter animation
    const enterTimer = setTimeout(() => setStage("visible"), 50);

    // Start exit animation
    const exitTimer = setTimeout(() => {
      setStage("exit");
    }, duration - 400);

    // Actually close
    const closeTimer = setTimeout(onClose, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setStage("exit");
    setTimeout(onClose, 400);
  };

  return (
    <div
      className={`
        transform transition-all ease-out
        ${stage === "enter" ? "scale-50 opacity-0 translate-y-4 duration-100" : ""}
        ${stage === "visible" ? "scale-100 opacity-100 translate-y-0 duration-500" : ""}
        ${stage === "exit" ? "scale-95 opacity-0 -translate-y-2 duration-300" : ""}
      `}
      style={{
        animation: stage === "visible" ? "toast-bounce 0.5s ease-out" : undefined,
      }}
    >
      <div
        className={`
          flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md
          border
          ${type === "success"
            ? "bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400/30 text-white"
            : "bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400/30 text-white"
          }
        `}
      >
        {type === "success" && (
          <div className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center animate-[checkmark_0.4s_ease-out_0.2s_both]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M5 13l4 4L19 7"
                className="animate-[draw-check_0.3s_ease-out_0.3s_both]"
                style={{
                  strokeDasharray: 24,
                  strokeDashoffset: 24,
                  animation: "draw-check 0.3s ease-out 0.3s forwards"
                }}
              />
            </svg>
          </div>
        )}
        <span className="text-sm font-semibold tracking-wide">{message}</span>
        <button
          onClick={handleClose}
          className="flex-shrink-0 ml-1 p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <style jsx>{`
        @keyframes toast-bounce {
          0% { transform: scale(0.8) translateY(10px); }
          50% { transform: scale(1.05) translateY(-5px); }
          70% { transform: scale(0.98) translateY(2px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes draw-check {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
