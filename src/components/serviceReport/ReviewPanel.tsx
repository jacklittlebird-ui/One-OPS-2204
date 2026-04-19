import { useState } from "react";
import { formatDateDMY } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react";

interface ReviewPanelProps {
  reportId: string;
  currentStatus: string;
  reviewComment: string;
  reviewedBy: string;
  reviewedAt: string | null;
  onReviewComplete: () => void;
}

export function ReviewStatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
    pending: { icon: <Clock size={12} />, cls: "bg-warning/15 text-warning", label: "Pending Review" },
    approved: { icon: <CheckCircle2 size={12} />, cls: "bg-success/15 text-success", label: "Approved" },
    rejected: { icon: <XCircle size={12} />, cls: "bg-destructive/15 text-destructive", label: "Rejected" },
  };
  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c.cls}`}>
      {c.icon}{c.label}
    </span>
  );
}

export default function ReviewPanel({ reportId, currentStatus, reviewComment, reviewedBy, reviewedAt, onReviewComplete }: ReviewPanelProps) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState(reviewComment || "");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleReview = async (newStatus: "approved" | "rejected") => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from("service_reports").update({
        review_status: newStatus,
        review_comment: comment,
        reviewed_by: "Operations",
        reviewed_at: new Date().toISOString(),
      } as any).eq("id", reportId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["service_reports"] });
      toast({ title: newStatus === "approved" ? "✅ Report Approved" : "❌ Report Rejected", description: comment || `Report has been ${newStatus}.` });
      onReviewComplete();
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1">
        <MessageSquare size={14} /> Review
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={18} /> Review Service Report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current Status:</span>
              <ReviewStatusBadge status={currentStatus} />
            </div>
            {reviewedBy && (
              <div className="text-xs text-muted-foreground">
                Last reviewed by <span className="font-semibold">{reviewedBy}</span>
                {reviewedAt && ` on ${formatDateDMY(reviewedAt)}`}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 text-sm border rounded px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Review Comment (required for rejection)"
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleReview("rejected")} disabled={submitting || (!comment && currentStatus !== "approved")} className="whitespace-nowrap">
                <XCircle size={14} className="mr-1" /> Reject & Return to Station
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
