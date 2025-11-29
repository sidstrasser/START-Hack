"use client";

import ActionButton from "../../components/ActionButton";

interface ActionButtonsGroupProps {
  analyzingAction: "arguments" | "outcome" | null;
  onArgumentsClick: () => void;
  onOutcomeClick: () => void;
}

export default function ActionButtonsGroup({
  analyzingAction,
  onArgumentsClick,
  onOutcomeClick,
}: ActionButtonsGroupProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      <ActionButton
        icon={
          <svg
            className="w-full h-full"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        }
        tooltip="Arguments"
        color="blue"
        size="sm"
        disabled={analyzingAction !== null}
        isLoading={analyzingAction === "arguments"}
        onClick={onArgumentsClick}
      />
      <ActionButton
        icon={
          <svg
            className="w-full h-full"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        }
        tooltip="Outcome"
        color="purple"
        size="sm"
        disabled={analyzingAction !== null}
        isLoading={analyzingAction === "outcome"}
        onClick={onOutcomeClick}
      />
    </div>
  );
}

