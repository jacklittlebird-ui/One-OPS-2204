import { describe, it, expect } from "vitest";

/**
 * Mirrors the init-effect guard inside SecurityTaskSheetDialog. The test
 * documents the contract: clicking "Save" (not "Save & Close") on a brand-new
 * task sheet flips the parent's row/isNew props ("new::new" → "<uuid>::edit")
 * for the SAME open dialog session, and the dialog MUST NOT re-initialize
 * sheet/editableRow from the freshly-saved snapshot — that would wipe the
 * user's in-progress edits.
 */

type SimState = {
  sheet: Record<string, string>;
  editableRow: { id?: string; flight_no?: string } | null;
  initializedKey: string | null;
};

function applyInitEffect(
  state: SimState,
  row: { id?: string; task_sheet_data?: Record<string, string> } | null,
  isNew: boolean,
): SimState {
  if (!row) return { ...state, initializedKey: null };
  const key = `${row.id || "new"}::${isNew ? "new" : "edit"}`;
  const prev = state.initializedKey;
  if (prev === key) return state;
  // GUARD — see SecurityTaskSheetDialog init effect for context.
  if (prev && prev.endsWith("::new") && key.endsWith("::edit")) {
    return {
      ...state,
      initializedKey: key,
      editableRow: state.editableRow
        ? { ...state.editableRow, id: row.id }
        : state.editableRow,
    };
  }
  // Regular (fresh open) initialization path.
  return {
    sheet: { ...(row.task_sheet_data || {}) },
    editableRow: { id: row.id },
    initializedKey: key,
  };
}

describe("SecurityTaskSheetDialog save guard", () => {
  it("does not overwrite sheet/editableRow when transitioning new::new → <uuid>::edit", () => {
    // 1) Open a brand-new dialog.
    let state: SimState = { sheet: {}, editableRow: null, initializedKey: null };
    state = applyInitEffect(state, { id: "new" }, true);
    expect(state.initializedKey).toBe("new::new");

    // 2) User types into the sheet and editableRow.
    state = {
      ...state,
      sheet: { flight_no: "AC123", registration: "SU-BVK", route: "SSH/CAI" },
      editableRow: { flight_no: "AC123" },
    };

    // 3) User clicks Save (not Save & Close). Parent rebinds row to the
    //    persisted record with a real uuid and flips isNew → false.
    state = applyInitEffect(
      state,
      { id: "uuid-1", task_sheet_data: { flight_no: "" /* server snapshot may lag */ } },
      false,
    );

    // The guard must keep the user's in-progress values intact.
    expect(state.sheet).toEqual({
      flight_no: "AC123",
      registration: "SU-BVK",
      route: "SSH/CAI",
    });
    expect(state.editableRow).toEqual({ id: "uuid-1", flight_no: "AC123" });
    expect(state.initializedKey).toBe("uuid-1::edit");
  });

  it("still initializes on a fresh open of an existing record", () => {
    let state: SimState = { sheet: {}, editableRow: null, initializedKey: null };
    state = applyInitEffect(
      state,
      { id: "uuid-2", task_sheet_data: { flight_no: "AC999" } },
      false,
    );
    expect(state.sheet).toEqual({ flight_no: "AC999" });
    expect(state.editableRow).toEqual({ id: "uuid-2" });
  });

  it("re-initializes when switching to a different record", () => {
    let state: SimState = { sheet: {}, editableRow: null, initializedKey: null };
    state = applyInitEffect(
      state,
      { id: "uuid-a", task_sheet_data: { flight_no: "AAA" } },
      false,
    );
    state = applyInitEffect(
      state,
      { id: "uuid-b", task_sheet_data: { flight_no: "BBB" } },
      false,
    );
    expect(state.sheet).toEqual({ flight_no: "BBB" });
    expect(state.editableRow).toEqual({ id: "uuid-b" });
  });
});
