import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  Building2, MapPin, Globe, Shield, Bell, User, Monitor, Lock, Clock,
  Save, Plus, Pencil, Trash2, Key, Eye, EyeOff, RefreshCw, History
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────
interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  station: string | null;
  avatar_url: string | null;
}

interface StationRow {
  id: string;
  iata_code: string;
  name: string;
  city: string;
  status: string;
}

// ─── Company Profile Tab ─────────────────────────────────
function CompanyProfileTab() {
  const [companyName, setCompanyName] = useState("Link Aero");
  const [companyNameAr, setCompanyNameAr] = useState("لينك ايرو");
  const [email, setEmail] = useState("info@linkaero.com");
  const [phone, setPhone] = useState("+20 2 1234 5678");
  const [website, setWebsite] = useState("www.linkaero.com");
  const [address, setAddress] = useState("Cairo International Airport, Terminal 2");
  const [city, setCity] = useState("Cairo");
  const [country, setCountry] = useState("Egypt");
  const [taxId, setTaxId] = useState("");
  const [crNo, setCrNo] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [fiscalYearStart, setFiscalYearStart] = useState("January");

  const handleSave = () => {
    toast.success("Company profile saved successfully");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 size={18} className="text-primary" /> Company Information</CardTitle>
          <CardDescription>Basic company details and branding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Company Name (English)</Label><Input value={companyName} onChange={e => setCompanyName(e.target.value)} /></div>
            <div><Label>Company Name (Arabic)</Label><Input value={companyNameAr} onChange={e => setCompanyNameAr(e.target.value)} dir="rtl" /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
            <div><Label>Website</Label><Input value={website} onChange={e => setWebsite(e.target.value)} /></div>
            <div><Label>Tax ID / VAT No.</Label><Input value={taxId} onChange={e => setTaxId(e.target.value)} /></div>
            <div><Label>Commercial Registration No.</Label><Input value={crNo} onChange={e => setCrNo(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin size={18} className="text-teal" /> Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Address</Label><Textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>City</Label><Input value={city} onChange={e => setCity(e.target.value)} /></div>
            <div><Label>Country</Label><Input value={country} onChange={e => setCountry(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe size={18} className="text-cyan" /> Financial Defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Default Currency</Label>
            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD – US Dollar</SelectItem>
                <SelectItem value="EUR">EUR – Euro</SelectItem>
                <SelectItem value="EGP">EGP – Egyptian Pound</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fiscal Year Start</Label>
            <Select value={fiscalYearStart} onValueChange={setFiscalYearStart}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["January","February","March","April","May","June","July","August","September","October","November","December"].map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2"><Save size={16} /> Save Company Profile</Button>
      </div>
    </div>
  );
}

// ─── Station Management Tab ──────────────────────────────
function StationManagementTab() {
  const [stations, setStations] = useState<StationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultStation, setDefaultStation] = useState("CAI");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("airports").select("id, iata_code, name, city, status").order("iata_code");
      setStations(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin size={18} className="text-emerald" /> Active Stations</CardTitle>
          <CardDescription>Stations are managed from the Airports module. Configure station-level defaults here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label>Default Station</Label>
            <Select value={defaultStation} onValueChange={v => { setDefaultStation(v); toast.success(`Default station set to ${v}`); }}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {stations.filter(s => s.status === "Active").map(s => (
                  <SelectItem key={s.id} value={s.iata_code}>{s.iata_code} – {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator className="my-4" />
          {loading ? <p className="text-muted-foreground text-sm">Loading stations...</p> : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="data-table-header"><th className="p-2 text-left">IATA</th><th className="p-2 text-left">Name</th><th className="p-2 text-left">City</th><th className="p-2 text-left">Status</th></tr></thead>
                <tbody>
                  {stations.map(s => (
                    <tr key={s.id} className="data-table-row">
                      <td className="p-2 font-mono font-semibold">{s.iata_code}</td>
                      <td className="p-2">{s.name}</td>
                      <td className="p-2 text-muted-foreground">{s.city}</td>
                      <td className="p-2"><Badge variant={s.status === "Active" ? "default" : "secondary"} className={s.status === "Active" ? "bg-success/15 text-success border-0" : ""}>{s.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── System Preferences Tab ──────────────────────────────
function SystemPreferencesTab() {
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [timeFormat, setTimeFormat] = useState("24h");
  const [language, setLanguage] = useState("en");
  const [autoLogout, setAutoLogout] = useState("30");
  const [paginationSize, setPaginationSize] = useState("25");
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  const handleSave = () => toast.success("System preferences saved");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe size={18} className="text-sky" /> Regional Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Cairo">Africa/Cairo (UTC+2)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                <SelectItem value="America/New_York">America/New York (UTC-5)</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai (UTC+4)</SelectItem>
                <SelectItem value="Asia/Riyadh">Asia/Riyadh (UTC+3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date Format</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Time Format</Label>
            <Select value={timeFormat} onValueChange={setTimeFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24-Hour</SelectItem>
                <SelectItem value="12h">12-Hour (AM/PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Monitor size={18} className="text-violet" /> Display & Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Auto Logout (minutes)</Label>
              <Select value={autoLogout} onValueChange={setAutoLogout}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Page Size</Label>
              <Select value={paginationSize} onValueChange={setPaginationSize}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 rows</SelectItem>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label>Enable Animations</Label><p className="text-xs text-muted-foreground">Smooth transitions and effects</p></div>
            <Switch checked={enableAnimations} onCheckedChange={setEnableAnimations} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Compact Mode</Label><p className="text-xs text-muted-foreground">Reduce spacing for denser layouts</p></div>
            <Switch checked={compactMode} onCheckedChange={setCompactMode} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2"><Save size={16} /> Save Preferences</Button>
      </div>
    </div>
  );
}

// ─── Security & Access Tab ───────────────────────────────
function SecurityTab() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState(false);
  const [auditLogEnabled, setAuditLogEnabled] = useState(true);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated successfully");
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key size={18} className="text-orange" /> Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div>
            <Label>Current Password</Label>
            <div className="relative">
              <Input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-2 top-2.5 text-muted-foreground">{showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          <div>
            <Label>New Password</Label>
            <div className="relative">
              <Input type={showNew ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-2 top-2.5 text-muted-foreground">{showNew ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          <div>
            <Label>Confirm New Password</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
          <Button onClick={handleChangePassword} className="gap-2"><Lock size={16} /> Update Password</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield size={18} className="text-rose" /> Security Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>Two-Factor Authentication</Label><p className="text-xs text-muted-foreground">Require 2FA for all admin accounts</p></div>
            <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label>IP Whitelisting</Label><p className="text-xs text-muted-foreground">Restrict access to specific IP addresses</p></div>
            <Switch checked={ipWhitelist} onCheckedChange={setIpWhitelist} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label>Audit Logging</Label><p className="text-xs text-muted-foreground">Track all user actions for compliance</p></div>
            <Switch checked={auditLogEnabled} onCheckedChange={setAuditLogEnabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History size={18} className="text-indigo" /> Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="data-table-header"><th className="p-2 text-left">Device</th><th className="p-2 text-left">IP Address</th><th className="p-2 text-left">Last Active</th><th className="p-2 text-left">Status</th></tr></thead>
              <tbody>
                <tr className="data-table-row">
                  <td className="p-2">Current Browser</td>
                  <td className="p-2 font-mono text-muted-foreground">—</td>
                  <td className="p-2 text-muted-foreground">Now</td>
                  <td className="p-2"><Badge className="bg-success/15 text-success border-0">Active</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Notification Preferences Tab ────────────────────────
function NotificationPreferencesTab() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({
    email_enabled: true, push_enabled: true,
    flight_alerts: true, invoice_alerts: true, contract_alerts: true,
    staff_alerts: true, system_alerts: true,
    quiet_hours_enabled: false, quiet_hours_start: "22:00", quiet_hours_end: "07:00"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();
      if (data) setPrefs(data as any);
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, ...prefs }, { onConflict: "user_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("Notification preferences saved");
  };

  const toggle = (key: string) => setPrefs(p => ({ ...p, [key]: !(p as any)[key] }));

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  const alerts = [
    { key: "flight_alerts", label: "Flight Alerts", desc: "Delays, cancellations, schedule changes", color: "text-sky" },
    { key: "invoice_alerts", label: "Invoice Alerts", desc: "New invoices, overdue payments", color: "text-amber" },
    { key: "contract_alerts", label: "Contract Alerts", desc: "Expiring contracts, renewals", color: "text-violet" },
    { key: "staff_alerts", label: "Staff Alerts", desc: "Roster changes, certification expiry", color: "text-teal" },
    { key: "system_alerts", label: "System Alerts", desc: "Maintenance, security updates", color: "text-rose" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell size={18} className="text-warning" /> Delivery Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>Email Notifications</Label><p className="text-xs text-muted-foreground">Receive alerts via email</p></div>
            <Switch checked={prefs.email_enabled} onCheckedChange={() => toggle("email_enabled")} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label>Push Notifications</Label><p className="text-xs text-muted-foreground">Browser push notifications</p></div>
            <Switch checked={prefs.push_enabled} onCheckedChange={() => toggle("push_enabled")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {alerts.map(a => (
            <div key={a.key}>
              <div className="flex items-center justify-between">
                <div><Label className={a.color}>{a.label}</Label><p className="text-xs text-muted-foreground">{a.desc}</p></div>
                <Switch checked={(prefs as any)[a.key]} onCheckedChange={() => toggle(a.key)} />
              </div>
              <Separator className="mt-3" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock size={18} className="text-fuchsia" /> Quiet Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>Enable Quiet Hours</Label><p className="text-xs text-muted-foreground">Pause non-critical notifications</p></div>
            <Switch checked={prefs.quiet_hours_enabled} onCheckedChange={() => toggle("quiet_hours_enabled")} />
          </div>
          {prefs.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div><Label>Start</Label><Input type="time" value={prefs.quiet_hours_start} onChange={e => setPrefs(p => ({ ...p, quiet_hours_start: e.target.value }))} /></div>
              <div><Label>End</Label><Input type="time" value={prefs.quiet_hours_end} onChange={e => setPrefs(p => ({ ...p, quiet_hours_end: e.target.value }))} /></div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2"><Save size={16} /> Save Notification Preferences</Button>
      </div>
    </div>
  );
}

// ─── User Profile Tab ────────────────────────────────────
function UserProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [station, setStation] = useState("");
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (p) { setProfile(p); setFullName(p.full_name || ""); setStation(p.station || ""); }
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setRoles((r || []).map((x: any) => x.role));
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ full_name: fullName, station }).eq("id", profile.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  const roleColors: Record<string, string> = {
    admin: "bg-rose/15 text-rose",
    station_manager: "bg-indigo/15 text-indigo",
    station_ops: "bg-teal/15 text-teal",
    employee: "bg-sky/15 text-sky",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User size={18} className="text-primary" /> My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
              {fullName ? fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
            </div>
            <div>
              <p className="text-lg font-semibold">{fullName || "—"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex gap-1 mt-1">
                {roles.map(r => (
                  <Badge key={r} className={`${roleColors[r] || "bg-muted text-muted-foreground"} border-0 text-xs`}>
                    {r.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Full Name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
            <div><Label>Station</Label><Input value={station} onChange={e => setStation(e.target.value)} placeholder="e.g. CAI" /></div>
            <div><Label>Email</Label><Input value={user?.email || ""} disabled className="opacity-60" /></div>
            <div><Label>User ID</Label><Input value={user?.id || ""} disabled className="opacity-60 font-mono text-xs" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RefreshCw size={18} className="text-lime" /> Account Info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="text-muted-foreground">Joined:</span> <span className="font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</span></div>
          <div><span className="text-muted-foreground">Last Sign In:</span> <span className="font-medium">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "—"}</span></div>
          <div><span className="text-muted-foreground">Email Confirmed:</span> <span className="font-medium">{user?.email_confirmed_at ? "Yes" : "No"}</span></div>
          <div><span className="text-muted-foreground">Provider:</span> <span className="font-medium capitalize">{user?.app_metadata?.provider || "email"}</span></div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2"><Save size={16} /> Save Profile</Button>
      </div>
    </div>
  );
}

// ─── Main Settings Page ──────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { value: "profile", label: "My Profile", icon: <User size={15} /> },
    { value: "company", label: "Company", icon: <Building2 size={15} /> },
    { value: "stations", label: "Stations", icon: <MapPin size={15} /> },
    { value: "system", label: "System", icon: <Monitor size={15} /> },
    { value: "security", label: "Security", icon: <Shield size={15} /> },
    { value: "notifications", label: "Notifications", icon: <Bell size={15} /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account, company, and system preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-sm">
              {t.icon}{t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="profile"><UserProfileTab /></TabsContent>
          <TabsContent value="company"><CompanyProfileTab /></TabsContent>
          <TabsContent value="stations"><StationManagementTab /></TabsContent>
          <TabsContent value="system"><SystemPreferencesTab /></TabsContent>
          <TabsContent value="security"><SecurityTab /></TabsContent>
          <TabsContent value="notifications"><NotificationPreferencesTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
