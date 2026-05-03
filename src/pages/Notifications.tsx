import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell, Check, CheckCheck, Trash2, Filter, Settings2,
  Plane, FileText, Receipt, Users, AlertCircle, Info
} from "lucide-react";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  is_read: boolean;
  link: string;
  created_at: string;
}

interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  flight_alerts: boolean;
  invoice_alerts: boolean;
  contract_alerts: boolean;
  staff_alerts: boolean;
  system_alerts: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_enabled: boolean;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  flight:   { icon: <Plane className="h-4 w-4" />, label: "Flight", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  invoice:  { icon: <Receipt className="h-4 w-4" />, label: "Invoice", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  contract: { icon: <FileText className="h-4 w-4" />, label: "Contract", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  staff:    { icon: <Users className="h-4 w-4" />, label: "Staff", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  system:   { icon: <AlertCircle className="h-4 w-4" />, label: "System", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <Check className="h-4 w-4 text-green-500" />,
  warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
};

const DEFAULT_PREFS: Omit<NotificationPreferences, "id" | "user_id"> = {
  email_enabled: true,
  push_enabled: true,
  flight_alerts: true,
  invoice_alerts: true,
  contract_alerts: true,
  staff_alerts: true,
  system_alerts: true,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
  quiet_hours_enabled: false,
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterRead, setFilterRead] = useState("all");

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setNotifications(data as Notification[]);
  };

  const fetchPrefs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setPrefs(data as NotificationPreferences);
    } else {
      // Create default preferences
      const { data: newPrefs } = await supabase
        .from("notification_preferences")
        .insert({ user_id: user.id, ...DEFAULT_PREFS })
        .select()
        .single();
      if (newPrefs) setPrefs(newPrefs as NotificationPreferences);
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchNotifications(), fetchPrefs()]).then(() => setLoading(false));

    // Realtime subscription
    const channel = supabase
      .channel("notifications-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    toast.success("All notifications marked as read");
    fetchNotifications();
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    toast.success("Notification deleted");
    fetchNotifications();
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    toast.success("All notifications cleared");
    fetchNotifications();
  };

  const updatePref = async (key: string, value: boolean | string) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await supabase.from("notification_preferences").update({ [key]: value } as any).eq("id", prefs.id);
    toast.success("Preference updated");
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterCategory !== "all" && n.category !== filterCategory) return false;
    if (filterRead === "unread" && n.is_read) return false;
    if (filterRead === "read" && !n.is_read) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" /> Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount} unread</Badge>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">Manage your notifications and alert preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark All Read
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll} disabled={notifications.length === 0}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear All
          </Button>
        </div>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList>
          <TabsTrigger value="notifications" className="flex items-center gap-1">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-1">
            <Settings2 className="h-4 w-4" /> Advanced Settings
          </TabsTrigger>
        </TabsList>

        {/* === NOTIFICATIONS TAB === */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="flex items-center gap-4 py-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground ml-auto">
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
              </span>
            </CardContent>
          </Card>

          {/* Notification List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-sm">You're all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((n) => {
                const catConfig = CATEGORY_CONFIG[n.category] || CATEGORY_CONFIG.system;
                return (
                  <Card key={n.id} className={`transition-colors ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}>
                    <CardContent className="flex items-start gap-3 py-3">
                      <div className="mt-0.5">{TYPE_ICONS[n.type] || TYPE_ICONS.info}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm">{n.title}</span>
                          <Badge variant="secondary" className={`text-[10px] ${catConfig.color}`}>
                            {catConfig.label}
                          </Badge>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!n.is_read && (
                          <Button variant="ghost" size="sm" onClick={() => markAsRead(n.id)} title="Mark as read">
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteNotification(n.id)} title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* === ADVANCED SETTINGS TAB === */}
        <TabsContent value="advanced" className="space-y-4">
          {/* Delivery Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch checked={prefs?.email_enabled ?? true} onCheckedChange={(v) => updatePref("email_enabled", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser push notifications</p>
                </div>
                <Switch checked={prefs?.push_enabled ?? true} onCheckedChange={(v) => updatePref("push_enabled", v)} />
              </div>
            </CardContent>
          </Card>

          {/* Alert Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alert Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "flight_alerts", label: "Flight Alerts", desc: "Schedule changes, delays, cancellations", icon: <Plane className="h-4 w-4" /> },
                { key: "invoice_alerts", label: "Invoice Alerts", desc: "New invoices, payment reminders, overdue", icon: <Receipt className="h-4 w-4" /> },
                { key: "contract_alerts", label: "Contract Alerts", desc: "Expiry warnings, renewal reminders", icon: <FileText className="h-4 w-4" /> },
                { key: "staff_alerts", label: "Staff Alerts", desc: "Roster changes, certification expiry", icon: <Users className="h-4 w-4" /> },
                { key: "system_alerts", label: "System Alerts", desc: "Security, maintenance, updates", icon: <AlertCircle className="h-4 w-4" /> },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{item.icon}</span>
                    <div>
                      <Label className="font-medium">{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={(prefs as any)?.[item.key] ?? true}
                    onCheckedChange={(v) => updatePref(item.key, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quiet Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium">Enable Quiet Hours</Label>
                  <p className="text-sm text-muted-foreground">Mute notifications during specified hours</p>
                </div>
                <Switch
                  checked={prefs?.quiet_hours_enabled ?? false}
                  onCheckedChange={(v) => updatePref("quiet_hours_enabled", v)}
                />
              </div>
              {prefs?.quiet_hours_enabled && (
                <div className="flex items-center gap-4 pt-2">
                  <div>
                    <Label className="text-sm">Start</Label>
                    <MaskedTimeInput
                      value={prefs.quiet_hours_start || ""}
                      onChange={(v) => updatePref("quiet_hours_start", v)}
                      className="w-[130px] flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">End</Label>
                    <MaskedTimeInput
                      value={prefs.quiet_hours_end || ""}
                      onChange={(v) => updatePref("quiet_hours_end", v)}
                      className="w-[130px] flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
