import { ReactNode } from "react";

interface ActionButtonProps {
  icon: ReactNode;
  tooltip: string;
  color: "blue" | "purple" | "green" | "red" | "yellow" | "gray";
  onClick: () => void;
}

const colorClasses = {
  blue: "bg-blue-600 hover:bg-blue-700",
  purple: "bg-purple-600 hover:bg-purple-700",
  green: "bg-green-600 hover:bg-green-700",
  red: "bg-red-600 hover:bg-red-700",
  yellow: "bg-yellow-600 hover:bg-yellow-700",
  gray: "bg-gray-600 hover:bg-gray-700",
};

export default function ActionButton({
  icon,
  tooltip,
  color,
  onClick,
}: ActionButtonProps) {
  const bgColor = colorClasses[color];

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`w-16 h-16 rounded-full ${bgColor} text-white flex items-center justify-center transition-colors duration-200 shadow-md hover:shadow-lg`}
      >
        {icon}
      </button>
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
        {tooltip}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  );
}

