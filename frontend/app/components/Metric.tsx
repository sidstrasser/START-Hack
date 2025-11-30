import { ReactNode } from "react";

interface MetricProps {
  label: string;
  value: string;
  color: "blue" | "amber" | "purple";
  fillPercentage: number; // 0-100
  icon?: ReactNode;
}

const colorClasses = {
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-600",
    fill: "bg-blue-500",
    track: "bg-blue-200",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    fill: "bg-amber-500",
    track: "bg-amber-200",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-600",
    fill: "bg-purple-500",
    track: "bg-purple-200",
  },
};

export default function Metric({ label, value, color, fillPercentage, icon }: MetricProps) {
  const colors = colorClasses[color];

  return (
    <div className="flex items-center gap-2.5">
      {/* Icon */}
      <div className={`p-1.5 rounded-md ${colors.bg}`}>
        <div className={`w-4 h-4 ${colors.text}`}>
          {icon}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-gray-500 truncate">{label}</span>
          <span className={`text-xs font-semibold ${colors.text}`}>{value}</span>
        </div>
        {/* Progress bar */}
        <div className={`w-full h-1 ${colors.track} rounded-full overflow-hidden`}>
        <div
            className={`h-full ${colors.fill} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, fillPercentage))}%` }}
        />
        </div>
      </div>
    </div>
  );
}

