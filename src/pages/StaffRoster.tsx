import { useState, useMemo } from "react";
import { formatDateDMY } from "@/lib/utils";
import { Search, Plus, Pencil, Trash2, X, Users, CheckCircle, Clock, AlertCircle, Database, Download, Eye, GraduationCap, Shield } from "lucide-react";
import { useSupabaseTable } from "@/hooks/useSupabaseQuery";
import { exportToExcel } from "@/lib/exportExcel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type ShiftType = "Morning" | "Afternoon" | "Night" | "Split" | "Off";
type StaffStatus = "Active" | "On Leave" | "Training" | "Suspended";
type StaffRole = "Supervisor" | "Agent" | "Dispatcher" | "Check-In" | "Ramp" | "Security" | "VIP" | "Admin";

type StaffRow = {
  id: string; employee_id: string; name: string; role: string; department: string;
  station: string; shift: ShiftType; shift_start: string; shift_end: string;
  status: StaffStatus; phone: string; email: string; join_date: string; cert_expiry: string;
  qualification: string; training_status: string; license_no: string; emergency_contact: string;
};

const statusCfg: Record<StaffStatus, string> = {
  Active: "bg-success/15 text-success", "On Leave": "bg-warning/15 text-warning",
  Training: "bg-info/15 text-info", Suspended: "bg-destructive/15 text-destructive",
};
const shiftCfg: Record<ShiftType, string> = {
  Morning: "bg-warning/10 text-warning", Afternoon: "bg-info/10 text-info",
  Night: "bg-primary/10 text-primary", Split: "bg-accent/10 text-accent-foreground", Off: "bg-muted text-muted-foreground",
};
const trainingCfg: Record<string, string> = {
  Current: "bg-success/15 text-success", "Due Soon": "bg-warning/15 text-warning", Expired: "bg-destructive/15 text-destructive", "N/A": "bg-muted text-muted-foreground",
};

export default function StaffRosterPage() {
  const { data: staff, isLoading, add, update, remove } = useSupabaseTable<StaffRow>("staff_roster");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [stationFilter, setStationFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<StaffRow | null>(null);
  const [editItem, setEditItem] = useState<StaffRow | null>(null);

  const emptyForm = { employee_id: "", name: "", role: "Agent", department: "", station: "CAI", shift: "Morning" as ShiftType, shift_start: "", shift_end: "", status: "Active" as StaffStatus, phone: "", email: "", join_date: new Date().toISOString().slice(0, 10), cert_expiry: "", qualification: "", training_status: "Current", license_no: "", emergency_contact: "" };
  const [form, setForm] = useState<any>(emptyForm);

  const stations = useMemo(() => [...new Set(staff.map(s => s.station))], [staff]);
  const filtered = useMemo(() => {
    let r = staff;
    if (roleFilter !== "All") r = r.filter(s => s.role === roleFilter);
    if (stationFilter !== "All") r = r.filter(s => s.station === stationFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(s) || x.employee_id.toLowerCase().includes(s) || x.department.toLowerCase().includes(s)); }
    return r;
  }, [staff, roleFilter, stationFilter, search]);

  const isExpiringSoon = (dateStr: string) => { if (!dateStr) return false; const diff = (new Date(dateStr).getTime() - Date.now()) / 86400000; return diff >= 0 && diff <= 90; };

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (row: StaffRow) => { setEditItem(row); setForm({ ...row }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.employee_id) return;
    const payload = { ...form };
    delete payload.id;
    if (editItem) { await update({ id: editItem.id, ...payload }); } else { await add(payload); }
    setDialogOpen(false);
  };

  const handleExport = () => exportToExcel(
    filtered.map(s => ({ "Emp ID": s.employee_id, Name: s.name, Role: s.role, Department: s.department, Station: s.station, Shift: s.shift, Status: s.status, Phone: s.phone, Email: s.email, Qualification: s.qualification, "Training Status": s.training_status, "License No": s.license_no, "Cert Expiry": s.cert_expiry, "Join Date": s.join_date })),
    "Staff Roster", "StaffRoster.xlsx"
  );

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2"><Users size={22} className="text-primary" /> Staff Roster</h1>
          <p className="text-muted-foreground text-sm mt-1">الكادر · Staff scheduling, qualifications & training</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download size={14} className="mr-1" /> Export</Button>
          <Button size="sm" onClick={openAdd}><Plus size={14} className="mr-1" /> Add Staff</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Users size={20} /></div><div><div className="text-xl md:text-2xl font-bold text-foreground">{staff.length}</div><div className="text-xs text-muted-foreground">Total Staff</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-xl md:text-2xl font-bold text-foreground">{staff.filter(s => s.status === "Active").length}</div><div className="text-xs text-muted-foreground">On Duty</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><Clock size={20} /></div><div><div className="text-xl md:text-2xl font-bold text-foreground">{staff.filter(s => s.status === "On Leave").length}</div><div className="text-xs text-muted-foreground">On Leave</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-info"><GraduationCap size={20} /></div><div><div className="text-xl md:text-2xl font-bold text-foreground">{staff.filter(s => s.training_status === "Due Soon" || s.training_status === "Expired").length}</div><div className="text-xs text-muted-foreground">Training Due</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-destructive"><AlertCircle size={20} /></div><div><div className="text-xl md:text-2xl font-bold text-foreground">{staff.filter(s => isExpiringSoon(s.cert_expiry)).length}</div><div className="text-xs text-muted-foreground">Cert Expiring</div></div></div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Staff Directory</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option>{(["Admin","Agent","Check-In","Dispatcher","Ramp","Security","Supervisor","VIP"] as StaffRole[]).map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={stationFilter} onChange={e => setStationFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option>{stations.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["EMP ID","NAME","ROLE","DEPT","STATION","SHIFT","TRAINING","STATUS","CERT EXPIRY","ACTIONS"].map(h => <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-16"><Database size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Staff Found</p></td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="data-table-row">
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-primary">{row.employee_id}</td>
                  <td className="px-3 py-2.5 font-semibold text-foreground">{row.name}</td>
                  <td className="px-3 py-2.5"><span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">{row.role}</span></td>
                  <td className="px-3 py-2.5 text-foreground text-xs">{row.department}</td>
                  <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground">{row.station}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${shiftCfg[row.shift] || ""}`}>{row.shift}</span></td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${trainingCfg[row.training_status] || trainingCfg["N/A"]}`}>{row.training_status}</span></td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg[row.status] || ""}`}>{row.status}</span></td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-medium ${isExpiringSoon(row.cert_expiry) ? "text-warning font-bold" : "text-foreground"}`}>
                      {formatDateDMY(row.cert_expiry)}{isExpiringSoon(row.cert_expiry) && " ⚠️"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 flex gap-1.5">
                    <button onClick={() => setDetailItem(row)} className="text-primary hover:text-primary/80"><Eye size={13} /></button>
                    <button onClick={() => openEdit(row)} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                    <button onClick={() => remove(row.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Staff — {detailItem?.name}</DialogTitle></DialogHeader>
          {detailItem && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground text-xs">Employee ID</span><p className="font-medium">{detailItem.employee_id}</p></div>
              <div><span className="text-muted-foreground text-xs">Role</span><p className="font-medium">{detailItem.role}</p></div>
              <div><span className="text-muted-foreground text-xs">Department</span><p className="font-medium">{detailItem.department}</p></div>
              <div><span className="text-muted-foreground text-xs">Station</span><p className="font-medium">{detailItem.station}</p></div>
              <div><span className="text-muted-foreground text-xs">Shift</span><p className="font-medium">{detailItem.shift} ({detailItem.shift_start}–{detailItem.shift_end})</p></div>
              <div><span className="text-muted-foreground text-xs">Status</span><p><Badge variant={detailItem.status === "Active" ? "default" : "secondary"}>{detailItem.status}</Badge></p></div>
              <div><span className="text-muted-foreground text-xs">Phone</span><p className="font-medium">{detailItem.phone || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Email</span><p className="font-medium">{detailItem.email || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Qualification</span><p className="font-medium">{detailItem.qualification || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">License No</span><p className="font-medium">{detailItem.license_no || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Training Status</span><p><Badge variant={detailItem.training_status === "Current" ? "default" : "destructive"}>{detailItem.training_status}</Badge></p></div>
              <div><span className="text-muted-foreground text-xs">Cert Expiry</span><p className="font-medium">{formatDateDMY(detailItem.cert_expiry)}</p></div>
              <div><span className="text-muted-foreground text-xs">Join Date</span><p className="font-medium">{formatDateDMY(detailItem.join_date)}</p></div>
              <div><span className="text-muted-foreground text-xs">Emergency Contact</span><p className="font-medium">{detailItem.emergency_contact || "—"}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? "Edit Staff" : "Add Staff"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Employee ID *" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} />
              <Input placeholder="Full Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.role || "Agent"} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(["Admin","Agent","Check-In","Dispatcher","Ramp","Security","Supervisor","VIP"] as StaffRole[]).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              <Input placeholder="Station" value={form.station} onChange={e => setForm({ ...form, station: e.target.value.toUpperCase() })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.shift} onValueChange={v => setForm({ ...form, shift: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Afternoon">Afternoon</SelectItem><SelectItem value="Morning">Morning</SelectItem><SelectItem value="Night">Night</SelectItem><SelectItem value="Off">Off</SelectItem><SelectItem value="Split">Split</SelectItem></SelectContent>
              </Select>
              <Input type="time" placeholder="Shift Start" value={form.shift_start} onChange={e => setForm({ ...form, shift_start: e.target.value })} />
              <Input type="time" placeholder="Shift End" value={form.shift_end} onChange={e => setForm({ ...form, shift_end: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Qualification" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} />
              <Input placeholder="License No" value={form.license_no} onChange={e => setForm({ ...form, license_no: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.training_status} onValueChange={v => setForm({ ...form, training_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Current">Current</SelectItem><SelectItem value="Due Soon">Due Soon</SelectItem><SelectItem value="Expired">Expired</SelectItem><SelectItem value="N/A">N/A</SelectItem></SelectContent>
              </Select>
              <div><label className="text-xs text-muted-foreground">Cert Expiry</label><Input type="date" value={form.cert_expiry} onChange={e => setForm({ ...form, cert_expiry: e.target.value })} /></div>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="On Leave">On Leave</SelectItem><SelectItem value="Training">Training</SelectItem><SelectItem value="Suspended">Suspended</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Join Date</label><Input type="date" value={form.join_date} onChange={e => setForm({ ...form, join_date: e.target.value })} /></div>
              <Input placeholder="Emergency Contact" value={form.emergency_contact} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} />
            </div>
            <Button className="w-full" onClick={handleSave}>{editItem ? "Update" : "Add Staff"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
