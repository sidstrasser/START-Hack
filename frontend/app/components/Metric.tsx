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
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    fill: "bg-blue-500",
    track: "bg-white/10",
  },
  amber: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    fill: "bg-amber-500",
    track: "bg-white/10",
  },
  purple: {
    bg: "bg-ds-accent-2/20",
    text: "text-ds-accent-2",
    fill: "bg-ds-accent-2",
    track: "bg-white/10",
  },
};

export default function Metric({ label, value, color, fillPercentage, icon }: MetricProps) {
  const colors = colorClasses[color];

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-ds-md bg-white/5 border border-white/5 transition-colors hover:bg-white/[0.07]">
      {/* Icon */}
      <div className={`p-2 rounded-ds-md ${colors.bg}`}>
        <div className={`w-4 h-4 ${colors.text}`}>
          {icon}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/50 truncate">{label}</span>
          <span className={`text-sm font-semibold ${colors.text}`}>{value}</span>
        </div>
        {/* Progress bar */}
        <div className={`w-full h-1.5 ${colors.track} rounded-full overflow-hidden`}>
        <div
            className={`h-full ${colors.fill} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${Math.min(100, Math.max(0, fillPercentage))}%` }}
        />
        </div>
      </div>
    </div>
  );
}
