import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDateDMY } from "@/lib/utils";
import type { ClearanceRow } from "./ClearanceTypes";

interface Props {
  item: ClearanceRow | null;
  onClose: () => void;
  airlineMap: Record<string, any>;
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium text-sm">{value || "—"}</p>
    </div>
  );
}

export default function ClearanceDetailDialog({ item, onClose, airlineMap }: Props) {
  if (!item) return null;
  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Flight Schedule — {item.permit_no || item.flight_no}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account (Airline)" value={item.airline_id ? airlineMap[item.airline_id]?.name : undefined} />
            <Field label="Station" value={item.authority} />
          </div>

          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Flight Details</h4>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Flight" value={item.flight_no} />
              <Field label="Route" value={item.route} />
              <Field label="Reg No" value={item.registration} />
              <Field label="Config" value={item.config} />
              <Field label="A/C Type" value={item.aircraft_type} />
              <Field label="Departure Flight" value={item.departure_flight} />
              <Field label="Arrival Flight" value={item.arrival_flight} />
              <Field label="Departure Date" value={formatDateDMY(item.departure_date)} />
              <Field label="Arrival Date" value={formatDateDMY(item.arrival_date)} />
              <Field label="STA" value={item.sta} />
              <Field label="STD" value={item.std} />
              <Field label="Skd Type" value={item.skd_type} />
              <Field label="Royalty" value={item.royalty ? "Yes" : "No"} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t pt-3">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Day of Week</h4>
              <div className="flex gap-1 flex-wrap">
                {(item.week_days || "").split(",").filter(Boolean).map(d => (
                  <Badge key={d} variant="secondary">{d}</Badge>
                ))}
                {!item.week_days && <span className="text-muted-foreground text-sm">—</span>}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Period of Schedule</h4>
              <div className="grid grid-cols-1 gap-1">
                <Field label="From" value={formatDateDMY(item.period_from)} />
                <Field label="To" value={formatDateDMY(item.period_to)} />
                <Field label="No of Flights" value={item.no_of_flights} />
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Clearance Info</h4>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Permit No" value={item.permit_no} />
              <Field label="Type" value={item.clearance_type} />
              <Field label="Status" value={item.status} />
              <Field label="Requested Date" value={formatDateDMY(item.requested_date)} />
              <Field label="Valid From" value={formatDateDMY(item.valid_from)} />
              <Field label="Valid To" value={formatDateDMY(item.valid_to)} />
              <Field label="Passengers" value={item.passengers} />
              <Field label="Cargo" value={`${item.cargo_kg} kg`} />
              <Field label="Handling Agent" value={item.handling_agent} />
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Other Info</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ref#" value={item.ref_no} />
              <Field label="Notes" value={item.notes} />
            </div>
            {item.remarks && <Field label="Remarks" value={item.remarks} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
