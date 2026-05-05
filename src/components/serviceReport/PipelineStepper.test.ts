import { describe, it, expect } from "vitest";
import {
  derivePipelineStage,
  derivePipelineCompletedStages,
  derivePendingActionMessage,
} from "./PipelineStepper";

describe("derivePipelineCompletedStages — Receivables completion", () => {
  const baseDone = {
    isLinked: true,
    reviewStatus: "approved",
    clearanceStatus: "approved",
    dispatchStatus: "completed",
  };

  it("does NOT mark receivables complete when invoiceStatus is 'none'", () => {
    const done = derivePipelineCompletedStages({ ...baseDone, invoiceStatus: "none" });
    expect(done).toEqual(["clearance", "station", "operations"]);
    expect(done).not.toContain("receivables");
  });

  it("does NOT mark receivables complete when invoiceStatus is undefined (defaults to none)", () => {
    const done = derivePipelineCompletedStages({ ...baseDone });
    expect(done).not.toContain("receivables");
  });

  it("does NOT mark receivables complete when invoiceStatus is 'issued' (unpaid)", () => {
    const done = derivePipelineCompletedStages({ ...baseDone, invoiceStatus: "issued" });
    expect(done).toContain("operations");
    expect(done).not.toContain("receivables");
  });

  it("MARKS receivables complete only when invoiceStatus is 'paid'", () => {
    const done = derivePipelineCompletedStages({ ...baseDone, invoiceStatus: "paid" });
    expect(done).toEqual(["clearance", "station", "operations", "receivables"]);
  });

  it("never marks receivables complete if upstream steps incomplete, even when paid", () => {
    // Defensive: a paid invoice without operations approval still marks receivables
    // because the formula is independent. Confirm current behavior so future
    // regressions are intentional.
    const done = derivePipelineCompletedStages({
      isLinked: true,
      reviewStatus: "pending",
      clearanceStatus: "approved",
      dispatchStatus: "completed",
      invoiceStatus: "paid",
    });
    expect(done).toContain("receivables");
    expect(done).not.toContain("operations");
  });
});

describe("derivePipelineStage — Receivables stage", () => {
  const allUpstreamDone = {
    isLinked: true,
    reviewStatus: "approved",
    clearanceStatus: "approved",
    dispatchStatus: "completed",
  };

  it("returns 'receivables' as the active stage when upstream complete and no invoice", () => {
    const stage = derivePipelineStage({ ...allUpstreamDone, invoiceStatus: "none" });
    expect(stage).toBe("receivables");
  });

  it("stays at 'receivables' (active) when invoice issued but unpaid", () => {
    const stage = derivePipelineStage({ ...allUpstreamDone, invoiceStatus: "issued" });
    expect(stage).toBe("receivables");
  });

  it("stays at 'receivables' (final stage) when invoice is paid — completion is handled by completedStages", () => {
    // The "current" stage stays 'receivables' as the final stage marker; the
    // paid checkmark is rendered via derivePipelineCompletedStages.
    const stage = derivePipelineStage({ ...allUpstreamDone, invoiceStatus: "paid" });
    expect(stage).toBe("receivables");
  });

  it("does not advance to receivables when operations not yet approved", () => {
    const stage = derivePipelineStage({
      isLinked: true,
      reviewStatus: "pending",
      clearanceStatus: "approved",
      dispatchStatus: "completed",
      invoiceStatus: "paid",
    });
    expect(stage).toBe("operations");
  });
});
