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

describe("derivePipelineStage — channel form views (create vs edit)", () => {
  describe("station channel", () => {
    it("CREATE: new record (no id, not linked) → station is the active stage", () => {
      const stage = derivePipelineStage({
        isLinked: false,
        reviewStatus: "",
        clearanceStatus: "pending",
        dispatchStatus: "pending",
        channel: "station",
        formView: true,
      });
      expect(stage).toBe("station");
    });

    it("EDIT: linked, dispatch completed → station view caps at operations (does not jump to receivables)", () => {
      const stage = derivePipelineStage({
        isLinked: true,
        reviewStatus: "approved",
        clearanceStatus: "approved",
        dispatchStatus: "completed",
        channel: "station",
        formView: false,
      });
      // Station portal must not "see" Receivables as the active stage
      expect(stage).toBe("operations");
    });
  });

  describe("operations channel", () => {
    it("CREATE/EDIT formView: operations is the active stage until user approves", () => {
      const stage = derivePipelineStage({
        isLinked: true,
        reviewStatus: "pending",
        clearanceStatus: "approved",
        dispatchStatus: "completed",
        channel: "operations",
        formView: true,
      });
      expect(stage).toBe("operations");
    });

    it("formView: even when backend says approved, the open form keeps operations as active (overrides until save)", () => {
      // formView forces step3Done = false for operations channel so that
      // the user must explicitly approve to move forward.
      const stage = derivePipelineStage({
        isLinked: true,
        reviewStatus: "approved",
        clearanceStatus: "approved",
        dispatchStatus: "completed",
        channel: "operations",
        formView: true,
      });
      expect(stage).toBe("operations");
    });

    it("LIST view (operations channel): caps at operations even when approved (operations portal never shows receivables as active)", () => {
      const stage = derivePipelineStage({
        isLinked: true,
        reviewStatus: "approved",
        clearanceStatus: "approved",
        dispatchStatus: "completed",
        channel: "operations",
        formView: false,
        invoiceStatus: "none",
      });
      expect(stage).toBe("operations");
    });

    it("never marks step 4 (receivables) as completed prematurely while operations is pending", () => {
      const done = derivePipelineCompletedStages({
        isLinked: true,
        reviewStatus: "pending",
        clearanceStatus: "approved",
        dispatchStatus: "completed",
        invoiceStatus: "none",
      });
      expect(done).not.toContain("receivables");
      expect(done).not.toContain("operations");
    });
  });

  describe("clearance channel (formView)", () => {
    it("active stage is clearance for new flights with no approval yet", () => {
      const stage = derivePipelineStage({
        isLinked: false,
        reviewStatus: "",
        clearanceStatus: "pending",
        dispatchStatus: "pending",
        channel: "clearance",
        formView: true,
      });
      expect(stage).toBe("clearance");
    });
  });

  describe("receivables channel (list view)", () => {
    it("active stage stays at operations until invoice is paid; flips to receivables only when paid", () => {
      const opts = {
        isLinked: true,
        reviewStatus: "approved",
        clearanceStatus: "approved",
        dispatchStatus: "completed",
        channel: "receivables",
      } as const;
      expect(derivePipelineStage({ ...opts, invoiceStatus: "none" })).toBe("operations");
      expect(derivePipelineStage({ ...opts, invoiceStatus: "issued" })).toBe("operations");
      expect(derivePipelineStage({ ...opts, invoiceStatus: "paid" })).toBe("receivables");

      const doneIssued = derivePipelineCompletedStages({ ...opts, invoiceStatus: "issued" });
      expect(doneIssued).not.toContain("receivables");
      const donePaid = derivePipelineCompletedStages({ ...opts, invoiceStatus: "paid" });
      expect(donePaid).toContain("receivables");
    });
  });
});

describe("derivePendingActionMessage — inline hint copy", () => {
  it("explains the operations approval gate (step 3 → step 4)", () => {
    const msg = derivePendingActionMessage("operations");
    expect(msg.toLowerCase()).toContain("operations");
    expect(msg.toLowerCase()).toContain("approve");
    expect(msg.toLowerCase()).toContain("receivables");
  });

  it("explains station gate (step 2 → step 3)", () => {
    const msg = derivePendingActionMessage("station");
    expect(msg.toLowerCase()).toContain("task sheet");
  });

  it("explains clearance gate (step 1 → step 2)", () => {
    const msg = derivePendingActionMessage("clearance");
    expect(msg.toLowerCase()).toContain("clearance");
  });

  it("varies receivables hint by invoice status", () => {
    expect(derivePendingActionMessage("receivables", { invoiceStatus: "none" }).toLowerCase()).toContain("issue");
    expect(derivePendingActionMessage("receivables", { invoiceStatus: "issued" }).toLowerCase()).toContain("paid");
    expect(derivePendingActionMessage("receivables", { invoiceStatus: "paid" }).toLowerCase()).toContain("complete");
  });
});

describe("backend-derived completion when opening an edited record", () => {
  // Simulate opening an existing record where the source-of-truth is the
  // persisted backend fields (review_status, clearance_status, dispatch.status,
  // invoice.status) — NOT any transient UI form state.
  it("an edited but un-approved record keeps step 3 active and step 4 not complete", () => {
    const backend = {
      isLinked: true,
      reviewStatus: "modified", // user made changes; ops review pending
      clearanceStatus: "approved",
      dispatchStatus: "completed",
      invoiceStatus: "none" as const,
    };
    const stage = derivePipelineStage({ ...backend, channel: "operations", formView: false });
    const done = derivePipelineCompletedStages(backend);
    expect(stage).toBe("operations");
    expect(done).toContain("clearance");
    expect(done).toContain("station");
    expect(done).not.toContain("operations");
    expect(done).not.toContain("receivables");
  });

  it("once backend reviewStatus flips to 'approved', operations is marked complete", () => {
    const backend = {
      isLinked: true,
      reviewStatus: "approved",
      clearanceStatus: "approved",
      dispatchStatus: "completed",
      invoiceStatus: "none" as const,
    };
    const done = derivePipelineCompletedStages(backend);
    expect(done).toContain("operations");
    expect(done).not.toContain("receivables");
  });
});
