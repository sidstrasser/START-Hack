import { ReactNode } from "react";

interface ActionButtonProps {
  icon: ReactNode;
  tooltip: string;
  color: "blue" | "purple" | "green" | "red" | "yellow" | "gray";
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
}

const colorClasses = {
  blue: "bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30 text-blue-400",
  purple: "bg-ds-accent-2/20 hover:bg-ds-accent-2/30 border-ds-accent-2/30 text-ds-accent-2",
  green: "bg-green-500/20 hover:bg-green-500/30 border-green-500/30 text-green-400",
  red: "bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400",
  yellow: "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30 text-amber-400",
  gray: "bg-white/10 hover:bg-white/20 border-white/20 text-white/70",
};

const disabledColorClasses = {
  blue: "bg-blue-500/10 border-blue-500/10 text-blue-400/40",
  purple: "bg-ds-accent-2/10 border-ds-accent-2/10 text-ds-accent-2/40",
  green: "bg-green-500/10 border-green-500/10 text-green-400/40",
  red: "bg-red-500/10 border-red-500/10 text-red-400/40",
  yellow: "bg-amber-500/10 border-amber-500/10 text-amber-400/40",
  gray: "bg-white/5 border-white/10 text-white/30",
};

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-16 h-16",
};

const iconSizeClasses = {
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export default function ActionButton({
  icon,
  tooltip,
  color,
  onClick,
  disabled = false,
  isLoading = false,
  size = "lg",
}: ActionButtonProps) {
  const bgColor = disabled ? disabledColorClasses[color] : colorClasses[color];
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizeClasses[size];

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${sizeClass} rounded-full ${bgColor} border backdrop-blur-xl flex items-center justify-center transition-all duration-200 ${
          disabled ? "cursor-not-allowed" : "hover:scale-105"
        }`}
      >
        {isLoading ? (
          <svg
            className={`${iconSize} animate-spin`}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <span className={iconSize}>{icon}</span>
        )}
      </button>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#0F1A3D] border border-white/20 text-white text-xs rounded-ds-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap backdrop-blur-xl">
        {isLoading ? "Analyzing..." : tooltip}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-[#0F1A3D]"></div>
        </div>
      </div>
    </div>
  );
}
