"use client";

interface MetricsDataPoint {
  timestamp: number;
  elapsedSeconds: number;
  value: number;
  risk: number;
  outcome: number;
}

interface MetricsChartProps {
  data: MetricsDataPoint[];
  dataKey: "value" | "risk" | "outcome";
  color: string;
  label: string;
}

export default function MetricsChart({ data, dataKey, color, label }: MetricsChartProps) {
  if (data.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
        Not enough data points
      </div>
    );
  }

  const values = data.map(d => d[dataKey]);
  const maxVal = Math.max(...values, 100);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  
  const width = 100;
  const height = 100;
  const padding = 10;
  
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (width - 2 * padding),
    y: height - padding - ((d[dataKey] - minVal) / range) * (height - 2 * padding)
  }));
  
  const pathD = points.reduce((path, point, i) => {
    return path + (i === 0 ? `M ${point.x},${point.y}` : ` L ${point.x},${point.y}`);
  }, '');
  
  const areaD = pathD + ` L ${points[points.length - 1].x},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="ml-auto text-lg font-bold" style={{ color }}>
          {data[data.length - 1][dataKey]}%
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
        {[0, 25, 50, 75, 100].map(val => (
          <line
            key={val}
            x1={padding}
            x2={width - padding}
            y1={height - padding - (val / 100) * (height - 2 * padding)}
            y2={height - padding - (val / 100) * (height - 2 * padding)}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        ))}
        <path d={areaD} fill={color} fillOpacity="0.1" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, i) => (
          <circle key={i} cx={point.x} cy={point.y} r="3" fill={color} />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>0:00</span>
        <span>{Math.floor(data[data.length - 1].elapsedSeconds / 60)}:{String(data[data.length - 1].elapsedSeconds % 60).padStart(2, '0')}</span>
      </div>
    </div>
  );
}

