import { ShieldCheck, Building2, ClipboardCheck, Receipt } from "lucide-react";

const STEPS = [
  { key: "clearance", label: "Clearance", icon: ShieldCheck },
  { key: "station", label: "Station", icon: Building2 },
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
}): PipelineStage {
  const isApproved = opts.clearanceStatus === "Approved";

  if (!isApproved && !opts.isLinked) return "clearance";
  if (isApproved && !opts.isLinked) return "operations";
  if (opts.reviewStatus === "rejected") return "station";
  if (opts.reviewStatus === "pending") return isApproved ? "operations" : "station";
  if (opts.reviewStatus === "approved") return "operations";
  return "receivables"; // ready_for_billing or invoiced
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
