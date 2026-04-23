import { ShieldCheck, Building2, ClipboardCheck, Receipt } from "lucide-react";

const STEPS = [
  { key: "clearance", label: "Clearance", icon: ShieldCheck },
  { key: "station", label: "Security Service", icon: Building2 },
  { key: "operations", label: "Operations", icon: ClipboardCheck },
  { key: "receivables", label: "Receivables", icon: Receipt },
] as const;

export type PipelineStage = "clearance" | "station" | "operations" | "receivables";

/**
 * Derives the current pipeline stage. The "current" stage is the first not-yet-completed step.
 *
 * Step completion rules (record/list view):
 *  1) Clearance — completed when clearance is approved (or when a dispatch is linked,
 *     which implies the flight passed clearance).
 *  2) Station   — completed when the station task sheet has been saved
 *     (dispatch.status === "Completed").
 *  3) Operations — completed when operations approves the report
 *     (review_status === "Approved" or "Ready for Billing").
 *  4) Receivables — final step (active once 1-3 are done).
 *
 * Form-view overrides ({ formView: true }):
 *  - In the station channel: force step 1 as done; step 2 is the active stage
 *    until the user saves (then record-view rules naturally advance it).
 *  - In the operations channel: force steps 1 & 2 as done; step 3 is the
 *    active stage until the operations user approves.
 */
export function derivePipelineStage(opts: {
  isLinked: boolean;
  reviewStatus: string;
  clearanceStatus?: string;
  dispatchStatus?: string;
  channel?: "station" | "operations" | string;
  /** True when rendering the stepper inside the open form/dialog (not the table row). */
  formView?: boolean;
}): PipelineStage {
  const rs = (opts.reviewStatus || "").toLowerCase();
  const ds = (opts.dispatchStatus || "").toLowerCase();
  const cs = (opts.clearanceStatus || "").toLowerCase();
  const ch = (opts.channel || "").toLowerCase();

  // --- Step completion flags (record-view truth) ---
  // Step 1 done when clearance is approved OR a dispatch already exists (linked).
  let step1Done = cs === "approved" || (opts.isLinked && cs !== "pending" && cs !== "rejected");
  if (!cs && opts.isLinked) step1Done = true;

  // Step 2 done when the task sheet is saved (dispatch completed).
  let step2Done = ds === "completed";

  // Step 3 done when operations approved (or already moved to billing).
  let step3Done =
    rs === "approved" || rs === "ready_for_billing" || rs === "ready for billing";

  // --- Form-view overrides ---
  if (opts.formView) {
    if (ch === "station") {
      // Opening the new/edit form in station = step 1 already complete and step 2
      // is the ACTIVE stage (the work the station is doing right now). We don't
      // advance to step 3 even if the record was previously saved — operations
      // approval still belongs to the operations channel.
      step1Done = true;
      step2Done = false;
      step3Done = false;
    } else if (ch === "operations") {
      // Opening the form in operations = steps 1 & 2 complete; step 3 is the active step
      // (unless ops has already approved, in which case keep step3Done as-is).
      step1Done = true;
      step2Done = true;
    }
  }

  // Rejected reports stay on step 2 (station) for rework.
  if (!opts.formView && rs === "rejected") {
    return "station";
  }
  // Modified reports (resubmitted by station after rejection) sit at step 3 (operations review).
  if (!opts.formView && rs === "modified") {
    return "operations";
  }

  let stage: PipelineStage;
  if (!step1Done) stage = "clearance";
  else if (!step2Done) stage = "station";
  else if (!step3Done) stage = "operations";
  else stage = "receivables";

  // Cap the pipeline display so it never advances past the channel's
  // designated step in record/list view. Station portal max = step 2,
  // Operations portal max = step 3. Receivables can see all stages.
  if (!opts.formView) {
    const order: PipelineStage[] = ["clearance", "station", "operations", "receivables"];
    const cap: Record<string, PipelineStage> = {
      station: "station",
      operations: "operations",
    };
    const maxStage = cap[ch];
    if (maxStage && order.indexOf(stage) > order.indexOf(maxStage)) {
      stage = maxStage;
    }
  }
  return stage;
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
