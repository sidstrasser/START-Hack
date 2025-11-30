import { useMemo } from "react";
import { ProgressEvent, AgentStatus } from "@/lib/types";

/**
 * Hook to aggregate progress events by agent for parallel agent display.
 *
 * @param events - Array of all progress events received
 * @returns Object with agents status and overall progress
 */
export function useParallelAgents(events: ProgressEvent[]) {
  const agentStatuses = useMemo(() => {
    // Define the expected agents
    const agentNames = [
      "supplier_summary",
      "market_analysis",
      "offer_analysis",
      "outcome_assessment",
      "action_items"
    ];

    // Initialize agent statuses
    const statuses: Record<string, AgentStatus> = {};

    agentNames.forEach(name => {
      statuses[name] = {
        name,
        status: "pending",
        message: "Waiting to start...",
        detail: "",
        progress: 0
      };
    });

    // Process events to update agent statuses
    events.forEach(event => {
      const agentName = event.agent;

      // Skip system and parse events (they're not parallel agents)
      if (agentName === "system" || agentName === "parse") {
        return;
      }

      // Update agent status if it's one of our parallel agents
      if (agentNames.includes(agentName)) {
        statuses[agentName] = {
          name: agentName,
          status: event.status === "keepalive" ? statuses[agentName].status : event.status,
          message: event.message,
          detail: event.detail || "",
          progress: event.agentProgress !== undefined ? event.agentProgress : statuses[agentName].progress
        };
      }
    });

    return statuses;
  }, [events]);

  // Calculate overall progress (average of all agent progress)
  const overallProgress = useMemo(() => {
    const progressValues = Object.values(agentStatuses).map(agent => agent.progress);
    if (progressValues.length === 0) return 0;

    const sum = progressValues.reduce((acc, val) => acc + val, 0);
    return sum / progressValues.length;
  }, [agentStatuses]);

  // Check if all agents are complete
  const allComplete = useMemo(() => {
    return Object.values(agentStatuses).every(agent => agent.status === "completed");
  }, [agentStatuses]);

  // Get array of agents for rendering
  const agentsArray = useMemo(() => {
    return Object.values(agentStatuses);
  }, [agentStatuses]);

  return {
    agents: agentStatuses,
    agentsArray,
    overallProgress,
    allComplete
  };
}
