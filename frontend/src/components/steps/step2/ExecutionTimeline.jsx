import React from "react";
import { useT } from "../../../context/ThemeContext";

/**
 * Flow-focused execution timeline matching the reference diagram style.
 * Represents the 4 stages of the task offloading lifecycle:
 * 1. Workload (IoT Source Machine)
 * 2. Allocation (GBFS + PSO parallel search)
 * 3. Dispatch (Route to Edge/Cloud nodes)
 * 4. Execution (Virtual server processing & resolution)
 */
export const ExecutionTimeline = ({
  machine,
  taskCount = 0,
  stage = 0, // 0: Ready, 1: Allocating, 2: Dispatching, 3: Executing/Complete
  isComplete = false,
}) => {
  const T = useT();

  const stages = [
    {
      id: "source",
      title: machine?.id || machine?.name || "Workload",
      subtitle: `${taskCount} IoT Tasks`,
    },
    {
      id: "algo",
      title: "GBFS + PSO",
      subtitle: "Dual Strategy Allocation",
    },
    {
      id: "dispatch",
      title: "Dispatch",
      subtitle: "Route to Edge & Cloud",
    },
    {
      id: "execution",
      title: "Virtual Servers",
      subtitle: isComplete ? "Batch Completed" : "Simulate Execution",
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "16px 12px 18px",
        overflowX: "auto",
      }}
    >
      {stages.map((st, idx) => {
        const isPast = idx < stage || isComplete;
        const isCurrent = idx === stage && !isComplete;

        const borderColor = isPast || isCurrent ? T.green : T.border;
        const bg = isCurrent
          ? `${T.green}18`
          : isPast
          ? `${T.green}0e`
          : T.elevated;
        const textColor = isPast || isCurrent ? T.green : T.dim;
        const titleColor = isPast || isCurrent ? T.text : T.muted;
        const subColor = isPast || isCurrent ? T.muted : T.dim;

        return (
          <React.Fragment key={st.id}>
            {/* Stage Box */}
            <div
              style={{
                minWidth: 125,
                maxWidth: 155,
                flex: "1 1 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "12px 10px",
                borderRadius: 8,
                background: bg,
                border: `1px solid ${borderColor}`,
                boxShadow: isCurrent ? `0 0 12px ${T.green}25` : "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* Checkmark indicator */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: isPast ? T.green : isCurrent ? T.amber : T.dim,
                  lineHeight: 1,
                  marginBottom: 6,
                  fontFamily: T.fontMono,
                }}
              >
                {isPast ? "✓" : isCurrent ? "●" : "○"}
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: T.fontMono,
                  color: titleColor,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}
              >
                {st.title}
              </div>

              {/* Subtitle */}
              <div
                style={{
                  fontSize: 11,
                  fontFamily: T.fontSans,
                  color: subColor,
                  lineHeight: 1.3,
                }}
              >
                {st.subtitle}
              </div>
            </div>

            {/* Connecting Arrow */}
            {idx < stages.length - 1 && (
              <div
                style={{
                  fontSize: 14,
                  color: idx < stage || isComplete ? T.green : T.dim,
                  fontFamily: T.fontMono,
                  flexShrink: 0,
                  userSelect: "none",
                  transition: "color 0.3s ease",
                }}
              >
                ▶
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

