interface MetricProps {
  label: string;
  value: string;
  color: "blue" | "yellow" | "green" | "purple" | "red";
  fillPercentage: number; // 0-100
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    fill: "bg-blue-500",
  },
  yellow: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    fill: "bg-yellow-500",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    fill: "bg-green-500",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    fill: "bg-purple-500",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    fill: "bg-red-500",
  },
};

export default function Metric({ label, value, color, fillPercentage }: MetricProps) {
  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} rounded-lg p-3 border ${colors.border}`}>
      <div className="text-xs text-gray-600 mb-1.5">{label}</div>
      <div className={`text-lg font-bold ${colors.text} mb-2`}>{value}</div>
      {/* Progress line */}
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.fill} transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, fillPercentage))}%` }}
        />
      </div>
    </div>
  );
}

