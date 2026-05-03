import { forwardRef } from "react";

/**
 * Auto-format & validate a 24-hour time input as HH:MM. Rejects invalid hours/minutes.
 * Project rule: NEVER use native browser time pickers.
 */
export function formatTimeInput(value: string, prevValue: string): string {
  let v = value.replace(/[^0-9:]/g, "");
  if (v === "") return "";

  const hasColon = v.includes(":");
  let hh = "";
  let mm = "";
  if (hasColon) {
    const [h = "", m = ""] = v.split(":");
    hh = h.slice(0, 2);
    mm = m.slice(0, 2);
  } else {
    hh = v.slice(0, 2);
    mm = v.slice(2, 4);
  }

  if (hh.length === 2) {
    const hNum = parseInt(hh, 10);
    if (isNaN(hNum) || hNum > 23) return prevValue;
  }
  if (mm.length === 2) {
    const mNum = parseInt(mm, 10);
    if (isNaN(mNum) || mNum > 59) return prevValue;
  }

  if (hh.length === 2 && mm.length > 0) return `${hh}:${mm}`;
  if (hh.length === 2) return `${hh}:`;
  return hh;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  id?: string;
}

export const MaskedTimeInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, className = "", placeholder = "HH:MM", readOnly, disabled, id }, ref) => {
    return (
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="numeric"
        maxLength={5}
        placeholder={placeholder}
        value={value || ""}
        readOnly={readOnly}
        disabled={disabled}
        onChange={e => onChange(formatTimeInput(e.target.value, value || ""))}
        className={`font-mono tracking-wider ${className}`}
      />
    );
  }
);
MaskedTimeInput.displayName = "MaskedTimeInput";
