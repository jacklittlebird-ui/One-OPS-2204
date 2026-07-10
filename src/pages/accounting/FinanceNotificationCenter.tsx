import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, FileText, CreditCard, Receipt, Shield, Lock, AlertCircle } from "lucide-react";

const FINANCE_CATEGORIES = ["invoice", "receipt", "payment", "approval", "period_close", "budget"];

const iconFor = (cat: string) => {
  const map: Record<string, any> = {
    invoice: <FileText className="w-4 h-4" />,
    receipt: <Receipt className="w-4 h-4" />,
    payment: <CreditCard className="w-4 h-4" />,
    approval: <Shield className="w-4 h-4" />,
    period_close: <Lock className="w-4 h-4" />,
    budget: <AlertCircle className="w-4 h-4" />,
  };
  return map[cat] ?? <Bell className="w-4 h-4" />;
};

export default function FinanceNotificationCenter() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: notifications = [] } = useQuery({
    queryKey: ["finance_notifications", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications")
        .select("*").eq("user_id", user!.id)
        .in("category", FINANCE_CATEGORIES)
        .order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: prefs } = useQuery({
    queryKey: ["notification_prefs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  // realtime updates
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel("finance-notif-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload: any) => {
        if (FINANCE_CATEGORIES.includes(payload.new?.category)) {
          qc.invalidateQueries({ queryKey: ["finance_notifications", user.id] });
          toast(payload.new.title, { description: payload.new.message });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance_notifications", user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ is_read: true })
        .eq("user_id", user!.id).eq("is_read", false).in("category", FINANCE_CATEGORIES);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All finance notifications marked as read");
      qc.invalidateQueries({ queryKey: ["finance_notifications", user?.id] });
    },
  });

  const savePref = useMutation({
    mutationFn: async (patch: any) => {
      if (prefs?.id) {
        const { error } = await supabase.from("notification_preferences").update(patch).eq("id", prefs.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notification_preferences").insert({ user_id: user!.id, ...patch });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Preferences saved"); qc.invalidateQueries({ queryKey: ["notification_prefs", user?.id] }); },
  });

  const unread = notifications.filter((n: any) => !n.is_read);
  const counts: Record<string, number> = {};
  notifications.forEach((n: any) => { if (!n.is_read) counts[n.category] = (counts[n.category] || 0) + 1; });

  const filterBy = (cat: string | null) => cat ? notifications.filter((n: any) => n.category === cat) : notifications;

  const renderList = (items: any[]) => (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No notifications.</p>}
      {items.map((n: any) => (
        <div key={n.id} className={`p-3 rounded-md border flex items-start gap-3 ${!n.is_read ? "bg-muted/40 border-primary/40" : ""}`}>
          <div className="mt-0.5 text-primary">{iconFor(n.category)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-medium">{n.title}</div>
              {!n.is_read && <Badge variant="default" className="text-[10px] px-1.5 py-0">NEW</Badge>}
              <Badge variant="outline" className="text-[10px]">{n.category}</Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">{n.message}</div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
              <span>{format(new Date(n.created_at), "dd/MM/yyyy HH:mm")}</span>
              {n.link && <Link to={n.link} className="text-primary hover:underline">Open →</Link>}
            </div>
          </div>
          {!n.is_read && (
            <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)}><Check className="w-4 h-4" /></Button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance Notification Center</h1>
          <p className="text-muted-foreground">Real-time alerts for invoices, receipts, payments, approvals, and period changes.</p>
        </div>
        <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={unread.length === 0}>
          <CheckCheck className="w-4 h-4 mr-2" />Mark all read
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Unread</div><div className="text-2xl font-bold">{unread.length}</div></CardContent></Card>
        {FINANCE_CATEGORIES.map((c) => (
          <Card key={c}>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground flex items-center gap-1">{iconFor(c)}{c.replace(/_/g, " ")}</div>
              <div className="text-2xl font-bold">{counts[c] || 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          {FINANCE_CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c}>{c.replace(/_/g, " ")} ({filterBy(c).length})</TabsTrigger>
          ))}
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4"><Card><CardContent className="pt-6">{renderList(notifications)}</CardContent></Card></TabsContent>
        {FINANCE_CATEGORIES.map((c) => (
          <TabsContent key={c} value={c} className="mt-4"><Card><CardContent className="pt-6">{renderList(filterBy(c))}</CardContent></Card></TabsContent>
        ))}

        <TabsContent value="preferences" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Delivery Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="flex items-center justify-between">
                <div><Label>Email delivery</Label><p className="text-xs text-muted-foreground">Also send notifications by email</p></div>
                <Switch checked={!!prefs?.email_enabled} onCheckedChange={(v) => savePref.mutate({ email_enabled: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>In-app push</Label><p className="text-xs text-muted-foreground">Show toast pop-ups in the app</p></div>
                <Switch checked={prefs?.push_enabled !== false} onCheckedChange={(v) => savePref.mutate({ push_enabled: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Invoice / receipt alerts</Label><p className="text-xs text-muted-foreground">Invoices finalized, payments received</p></div>
                <Switch checked={prefs?.invoice_alerts !== false} onCheckedChange={(v) => savePref.mutate({ invoice_alerts: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>System alerts</Label><p className="text-xs text-muted-foreground">Approvals, period close, budget breaches</p></div>
                <Switch checked={prefs?.system_alerts !== false} onCheckedChange={(v) => savePref.mutate({ system_alerts: v })} />
              </div>
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div><Label>Quiet hours</Label><p className="text-xs text-muted-foreground">Suppress push notifications during these hours</p></div>
                  <Switch checked={!!prefs?.quiet_hours_enabled} onCheckedChange={(v) => savePref.mutate({ quiet_hours_enabled: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start (HH:MM)</Label><Input value={prefs?.quiet_hours_start ?? "22:00"} onChange={(e) => savePref.mutate({ quiet_hours_start: e.target.value })} /></div>
                  <div><Label>End (HH:MM)</Label><Input value={prefs?.quiet_hours_end ?? "07:00"} onChange={(e) => savePref.mutate({ quiet_hours_end: e.target.value })} /></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
