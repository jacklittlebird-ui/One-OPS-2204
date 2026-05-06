import { ShieldCheck, Building2, ClipboardCheck, Receipt } from "lucide-react";

// Each pipeline step has its own semantic color token so the four stages are
// visually distinct in every portal (Clearance, Station, Operations, Receivables).
const STEPS = [
  { key: "clearance",   label: "Clearance",        icon: ShieldCheck,    colorVar: "--info" },     // blue
  { key: "station",     label: "Security Service", icon: Building2,      colorVar: "--violet" },   // violet
  { key: "operations",  label: "Operations",       icon: ClipboardCheck, colorVar: "--warning" },  // amber/orange
  { key: "receivables", label: "Receivables",      icon: Receipt,        colorVar: "--success" },  // green
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
  /** Receivables progress: "none" = no invoice yet, "issued" = invoice exists but unpaid,
   *  "paid" = invoice fully paid. Receivables is only COMPLETE when "paid". */
  invoiceStatus?: "none" | "issued" | "paid";
}): PipelineStage {
  const rs = (opts.reviewStatus || "").toLowerCase();
  const ds = (opts.dispatchStatus || "").toLowerCase();
  const cs = (opts.clearanceStatus || "").toLowerCase();
  const ch = (opts.channel || "").toLowerCase();
  const inv = opts.invoiceStatus || "none";

  // --- Step completion flags (record-view truth) ---
  let step1Done = cs === "approved" || (opts.isLinked && cs !== "pending" && cs !== "rejected");
  if (!cs && opts.isLinked) step1Done = true;

  let step2Done = ds === "completed";

  let step3Done =
    rs === "approved" || rs === "ready_for_billing" || rs === "ready for billing";

  // Step 4 (receivables) — only complete once the invoice is PAID.
  const step4Done = inv === "paid";

  // --- Form-view overrides ---
  if (opts.formView) {
    if (ch === "station") {
      step1Done = true;
      step2Done = false;
      step3Done = false;
    } else if (ch === "operations") {
      step1Done = true;
      step2Done = true;
      step3Done = false;
    }
  }

  if (!opts.formView && rs === "rejected") {
    return "station";
  }
  if (!opts.formView && rs === "modified") {
    return "operations";
  }

  let stage: PipelineStage;
  if (!step1Done) stage = "clearance";
  else if (!step2Done) stage = "station";
  else if (!step3Done) stage = "operations";
  else stage = "receivables"; // active until step4Done; even if paid, last stage stays "receivables"
  // (consumers use completedStages to render the paid checkmark)
  void step4Done;

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
    // Station view: uncompleted (dispatch not completed) → step 1 active;
    // completed → step 2 active (and station appears in completedStages).
    if (ch === "station") {
      stage = ds === "completed" ? "station" : "clearance";
    }
    // Receivables view: stage 4 only lights up once the invoice is PAID.
    // Until then, show stage 3 (operations) as the active step.
    if (ch === "receivables" && inv !== "paid" && order.indexOf(stage) >= order.indexOf("receivables")) {
      stage = "operations";
    }
  }
  return stage;
}

/**
 * Returns the explicit set of completed steps for a record, independent of the
 * "current" stage. Receivables is only included when the invoice is PAID.
 */
export function derivePipelineCompletedStages(opts: {
  isLinked: boolean;
  reviewStatus: string;
  clearanceStatus?: string;
  dispatchStatus?: string;
  invoiceStatus?: "none" | "issued" | "paid";
}): PipelineStage[] {
  const rs = (opts.reviewStatus || "").toLowerCase();
  const ds = (opts.dispatchStatus || "").toLowerCase();
  const cs = (opts.clearanceStatus || "").toLowerCase();
  const inv = opts.invoiceStatus || "none";

  const done: PipelineStage[] = [];
  if (cs === "approved" || (opts.isLinked && cs && cs !== "pending" && cs !== "rejected")) {
    done.push("clearance");
  } else if (!cs && opts.isLinked) {
    done.push("clearance");
  }
  if (ds === "completed") done.push("station");
  if (rs === "approved" || rs === "ready_for_billing" || rs === "ready for billing") {
    done.push("operations");
  }
  if (inv === "paid") done.push("receivables");
  return done;
}

/**
 * Returns a short, human-readable description of what action is required to
 * advance from the given stage to the next one. Used by the stepper to surface
 * an inline hint/tooltip so users know who needs to approve next.
 */
export function derivePendingActionMessage(
  currentStage: PipelineStage,
  opts?: { invoiceStatus?: "none" | "issued" | "paid" }
): string {
  switch (currentStage) {
    case "clearance":
      return "Clearance must approve this flight to advance to the Security Service step.";
    case "station":
      return "Station must save the security task sheet to advance to the Operations step.";
    case "operations":
      return "Operations must approve this report to advance to the Receivables step.";
    case "receivables": {
      const inv = opts?.invoiceStatus || "none";
      if (inv === "paid") return "All steps complete — invoice paid.";
      if (inv === "issued") return "Invoice issued. Receivables completes once the invoice is fully paid.";
      return "Receivables must issue and collect the invoice to complete the pipeline.";
    }
    default:
      return "";
  }
}

interface PipelineStepperProps {
  currentStage: PipelineStage;
  /** Optional explicit set of completed stages. When provided, it overrides
   *  the default "all stages before currentStage are completed" behavior so
   *  steps can complete out of order. */
  completedStages?: PipelineStage[];
  compact?: boolean;
  /** Show an inline hint message under the stepper describing the next action.
   *  Ignored when compact is true (compact uses the title attribute instead). */
  showPendingHint?: boolean;
  /** Receivables progress, used to refine the pending hint for the final step. */
  invoiceStatus?: "none" | "issued" | "paid";
}

export default function PipelineStepper({ currentStage, completedStages, compact = false, showPendingHint = false, invoiceStatus }: PipelineStepperProps) {
  const currentIdx = STEPS.findIndex(s => s.key === currentStage);
  const completedSet = completedStages ? new Set(completedStages) : null;

  const stepIsCompleted = (i: number, key: PipelineStage) =>
    completedSet ? completedSet.has(key) : i < currentIdx;

  const pendingHint = derivePendingActionMessage(currentStage, { invoiceStatus });

  if (compact) {
    return (
      <div className="flex items-center gap-0.5" title={pendingHint}>
        {STEPS.map((step, i) => {
          const isCompleted = stepIsCompleted(i, step.key);
          const isCurrent = i === currentIdx && !isCompleted;
          const colorStyle = (isCompleted || isCurrent)
            ? { backgroundColor: `hsl(var(${step.colorVar}))`, color: `hsl(var(${step.colorVar}-foreground))` }
            : undefined;
          const ringStyle = isCurrent
            ? { boxShadow: `0 0 0 2px hsl(var(${step.colorVar}) / 0.3)` }
            : undefined;
          return (
            <div key={step.key} className="flex items-center gap-0.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors
                  ${!isCompleted && !isCurrent ? "bg-muted text-muted-foreground" : ""}
                `}
                style={{ ...colorStyle, ...ringStyle }}
                title={isCurrent ? `${step.label} — ${pendingHint}` : step.label}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-3 h-0.5 ${stepIsCompleted(i, step.key) ? "" : "bg-border"}`}
                  style={stepIsCompleted(i, step.key) ? { backgroundColor: `hsl(var(${step.colorVar}))` } : undefined}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isCompleted = stepIsCompleted(i, step.key);
          const isCurrent = i === currentIdx && !isCompleted;
          const colorStyle = (isCompleted || isCurrent)
            ? { backgroundColor: `hsl(var(${step.colorVar}))`, color: `hsl(var(${step.colorVar}-foreground))` }
            : undefined;
          const ringStyle = isCurrent
            ? { boxShadow: `0 0 0 2px hsl(var(${step.colorVar}) / 0.3)` }
            : undefined;
          return (
            <div key={step.key} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-0.5" title={isCurrent ? pendingHint : step.label}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors
                    ${!isCompleted && !isCurrent ? "bg-muted text-muted-foreground" : ""}
                  `}
                  style={{ ...colorStyle, ...ringStyle }}
                >
                  <Icon size={13} />
                </div>
                <span
                  className={`text-[9px] leading-tight whitespace-nowrap ${isCurrent ? "font-semibold" : "text-muted-foreground"}`}
                  style={isCurrent ? { color: `hsl(var(${step.colorVar}))` } : undefined}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-4 h-0.5 mb-3 ${stepIsCompleted(i, step.key) ? "" : "bg-border"}`}
                  style={stepIsCompleted(i, step.key) ? { backgroundColor: `hsl(var(${step.colorVar}))` } : undefined}
                />
              )}
            </div>
          );
        })}
      </div>
      {showPendingHint && pendingHint && (
        <div className="text-[11px] text-muted-foreground italic max-w-md text-center px-2">
          {pendingHint}
        </div>
      )}
    </div>
  );
}
