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
  blue: "bg-blue-600 hover:bg-blue-700",
  purple: "bg-purple-600 hover:bg-purple-700",
  green: "bg-green-600 hover:bg-green-700",
  red: "bg-red-600 hover:bg-red-700",
  yellow: "bg-yellow-600 hover:bg-yellow-700",
  gray: "bg-gray-600 hover:bg-gray-700",
};

const disabledColorClasses = {
  blue: "bg-blue-600/40",
  purple: "bg-purple-600/40",
  green: "bg-green-600/40",
  red: "bg-red-600/40",
  yellow: "bg-yellow-600/40",
  gray: "bg-gray-600/40",
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
        className={`${sizeClass} rounded-full ${bgColor} text-white flex items-center justify-center transition-all duration-200 shadow-md ${
          disabled ? "cursor-not-allowed opacity-60" : "hover:shadow-lg hover:scale-105"
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
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        {isLoading ? "Loading..." : tooltip}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  );
}

