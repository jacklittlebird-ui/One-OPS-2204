import { ShieldCheck, Building2, ClipboardCheck, Receipt } from "lucide-react";

const STEPS = [
  { key: "clearance", label: "Clearance", icon: ShieldCheck },
  { key: "station", label: "Security Service", icon: Building2 },
  { key: "operations", label: "Operations", icon: ClipboardCheck },
  { key: "receivables", label: "Receivables", icon: Receipt },
] as const;

export type PipelineStage = "clearance" | "station" | "operations" | "receivables";

/**
 * Derives the current pipeline stage from report data:
 * - Clearance not approved → clearance (step 1)
 * - Clearance approved but no linked report / review pending → station (step 2)  
 *   After clearance approval, steps 1 & 2 are considered done → operations (step 3)
 * - Review approved → operations (step 3)
 * - Ready for billing / invoiced → receivables (step 4)
 */
export function derivePipelineStage(opts: {
  isLinked: boolean;
  reviewStatus: string;
  clearanceStatus?: string;
  dispatchStatus?: string;
  /**
   * Channel context where the report is being viewed/edited.
   * - "station": editing in station view marks step 2 (Station) as the furthest progress.
   *   Current stage shown = "operations" (steps 1 & 2 done, step 3 active, step 3 NOT completed).
   * - "operations": editing in operations view marks step 3 (Operations) as completed.
   *   Current stage shown = "receivables" (steps 1, 2, 3 done, step 4 active).
   */
  channel?: "station" | "operations" | string;
}): PipelineStage {
  const rs = opts.reviewStatus?.toLowerCase() || "";
  const ds = opts.dispatchStatus?.toLowerCase() || "";
  const cs = opts.clearanceStatus?.toLowerCase() || "";
  const ch = opts.channel?.toLowerCase();

  // Ready for billing → receivables (step 4)
  if (rs === "ready_for_billing" || rs === "ready for billing") return "receivables";

  // Operations channel: when reviewing a linked report, show step 3 (Operations) as the
  // active stage with steps 1 (Clearance) and 2 (Station) marked completed.
  // Only after the operations user approves does the report move forward to receivables.
  if (ch === "operations" && opts.isLinked) {
    if (rs === "approved") return "receivables";
    return "operations";
  }

  // Clearance not yet approved → step 1 (Clearance) is the active stage
  if (cs && cs !== "approved") return "clearance";

  // When viewing/editing inside the Station channel, the furthest completion is step 2.
  // Show step 3 (Operations) as the active (not-yet-completed) stage.
  if (ch === "station" && opts.isLinked && (ds === "completed" || cs === "approved" || rs === "approved")) {
    return "operations";
  }

  // Clearance approved + station task completed → step 2 done, move to step 3 (Operations)
  if (cs === "approved" && ds === "completed") return "operations";

  // Station has completed their task sheet (no clearance link) → still on station step (step 2)
  if (ds === "completed") return "station";

  // Rejected → back to clearance
  if (rs === "rejected") return "clearance";

  // New reports start at clearance for approval
  if (rs === "pending" || rs === "pending review" || rs === "draft") return "clearance";

  // After clearance approval but station not yet completed → station (step 2)
  if (rs === "approved") return "station";

  // Fallback
  return "station";
}

interface PipelineStepperProps {
  currentStage: PipelineStage;
  compact?: boolean;
}

export default function PipelineStepper({ currentStage, compact = false }: PipelineStepperProps) {
  const currentIdx = STEPS.findIndex(s => s.key === currentStage);

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.key} className="flex items-center gap-0.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors
                  ${isCompleted ? "bg-primary text-primary-foreground" : ""}
                  ${isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : ""}
                  ${!isCompleted && !isCurrent ? "bg-muted text-muted-foreground" : ""}
                `}
                title={step.label}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-3 h-0.5 ${i < currentIdx ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isCompleted = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors
                  ${isCompleted ? "bg-primary text-primary-foreground" : ""}
                  ${isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : ""}
                  ${!isCompleted && !isCurrent ? "bg-muted text-muted-foreground" : ""}
                `}
              >
                <Icon size={13} />
              </div>
              <span className={`text-[9px] leading-tight whitespace-nowrap ${isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-0.5 mb-3 ${i < currentIdx ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
