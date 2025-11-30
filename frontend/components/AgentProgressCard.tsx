"use client";

import { AgentStatus } from "@/lib/types";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

interface AgentProgressCardProps extends AgentStatus {}

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  supplier_summary: "Supplier Research",
  market_analysis: "Market Analysis",
  offer_analysis: "Offer Analysis",
  outcome_assessment: "Outcome Assessment",
  action_items: "Action Items"
};

export default function AgentProgressCard({
  name,
  status,
  message,
  detail,
  progress
}: AgentProgressCardProps) {
  const displayName = AGENT_DISPLAY_NAMES[name] || name;

  // Determine border color based on status
  const borderColor = {
    pending: "border-gray-300",
    running: "border-blue-500",
    completed: "border-green-500",
    error: "border-red-500"
  }[status];

  // Determine icon
  const StatusIcon = {
    pending: Circle,
    running: Loader2,
    completed: CheckCircle2,
    error: XCircle
  }[status];

  const iconColor = {
    pending: "text-gray-400",
    running: "text-blue-500",
    completed: "text-green-500",
    error: "text-red-500"
  }[status];

  return (
    <div className={`border-2 ${borderColor} rounded-lg p-4 bg-white shadow-sm transition-all`}>
      {/* Header with icon and name */}
      <div className="flex items-center gap-2 mb-3">
        <StatusIcon
          className={`w-5 h-5 ${iconColor} ${status === "running" ? "animate-spin" : ""}`}
        />
        <h3 className="font-semibold text-sm">{displayName}</h3>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            status === "completed" ? "bg-green-500" :
            status === "error" ? "bg-red-500" :
            status === "running" ? "bg-blue-500" :
            "bg-gray-400"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Progress percentage */}
      <div className="text-xs text-gray-500 mb-2">
        {Math.round(progress * 100)}%
      </div>

      {/* Message */}
      <p className="text-sm text-gray-700">{message}</p>

      {/* Detail (if present) */}
      {detail && (
        <p className="text-xs text-gray-500 mt-1">{detail}</p>
      )}
    </div>
  );
}
