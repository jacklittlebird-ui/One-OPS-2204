import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useChannel, CHANNEL_LABELS, CHANNEL_DESCRIPTIONS, type Channel } from "@/contexts/ChannelContext";
import { 
  ShieldCheck, Building2, FileText, Eye, Receipt, CreditCard, Shield
} from "lucide-react";

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
  clearance: <ShieldCheck size={14} />,
  station: <Building2 size={14} />,
  contracts: <FileText size={14} />,
  operations: <Eye size={14} />,
  receivables: <Receipt size={14} />,
  payables: <CreditCard size={14} />,
  admin: <Shield size={14} />,
};

export function ChannelSwitcher() {
  const { channels, activeChannel, setActiveChannel } = useChannel();

  if (channels.length <= 1) {
    return (
      <div className="mx-3 mb-2 px-3 py-2 rounded-md bg-white/80 dark:bg-muted/50 flex items-center gap-2 text-xs text-sidebar-foreground">
        {CHANNEL_ICONS[activeChannel]}
        <span className="font-semibold uppercase tracking-wider">{CHANNEL_LABELS[activeChannel]}</span>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2">
      <Select value={activeChannel} onValueChange={(v) => setActiveChannel(v as Channel)}>
        <SelectTrigger className="h-9 bg-white/80 dark:bg-muted/50 border-sidebar-border text-sidebar-foreground text-xs font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            {CHANNEL_ICONS[activeChannel]}
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {channels.map(ch => (
            <SelectItem key={ch} value={ch}>
              <div className="flex items-center gap-2">
                {CHANNEL_ICONS[ch]}
                <div>
                  <div className="font-semibold text-xs">{CHANNEL_LABELS[ch]}</div>
                  <div className="text-[10px] text-muted-foreground">{CHANNEL_DESCRIPTIONS[ch]}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
