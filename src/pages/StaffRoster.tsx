import { useState, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, X, Users, CheckCircle, Clock, AlertCircle, Database } from "lucide-react";

type ShiftType = "Morning" | "Afternoon" | "Night" | "Split" | "Off";
type StaffRole = "Supervisor" | "Agent" | "Dispatcher" | "Check-In" | "Ramp" | "Security" | "VIP" | "Admin";
type StaffStatus = "Active" | "On Leave" | "Training" | "Suspended";

interface StaffMember {
  id: string;
  employeeId: string;
  name: string;
  role: StaffRole;
  department: string;
  station: string;
  shift: ShiftType;
  shiftStart: string;
  shiftEnd: string;
  status: StaffStatus;
  phone: string;
  email: string;
  joinDate: string;
  certExpiry: string;
}

const sampleStaff: StaffMember[] = [
  { id: "S001", employeeId: "LE-001", name: "Ahmed Mohamed", role: "Supervisor", department: "Ground Handling", station: "CAI", shift: "Morning", shiftStart: "06:00", shiftEnd: "14:00", status: "Active", phone: "+201001111111", email: "ahmed.m@linkegypt.com", joinDate: "2019-03-01", certExpiry: "2025-06-01" },
  { id: "S002", employeeId: "LE-002", name: "Sara Ibrahim", role: "Check-In", department: "Passenger Services", station: "CAI", shift: "Afternoon", shiftStart: "14:00", shiftEnd: "22:00", status: "Active", phone: "+201002222222", email: "sara.i@linkegypt.com", joinDate: "2021-07-15", certExpiry: "2024-12-01" },
  { id: "S003", employeeId: "LE-003", name: "Omar Khalil", role: "Ramp", department: "Ramp Services", station: "HRG", shift: "Night", shiftStart: "22:00", shiftEnd: "06:00", status: "On Leave", phone: "+201003333333", email: "omar.k@linkegypt.com", joinDate: "2020-01-10", certExpiry: "2025-03-01" },
  { id: "S004", employeeId: "LE-004", name: "Nour Eldin", role: "Security", department: "Security", station: "SSH", shift: "Morning", shiftStart: "06:00", shiftEnd: "14:00", status: "Training", phone: "+201004444444", email: "nour.e@linkegypt.com", joinDate: "2023-09-01", certExpiry: "2024-08-15" },
  { id: "S005", employeeId: "LE-005", name: "Laila Saad", role: "VIP", department: "VIP Services", station: "CAI", shift: "Split", shiftStart: "08:00", shiftEnd: "20:00", status: "Active", phone: "+201005555555", email: "laila.s@linkegypt.com", joinDate: "2018-11-20", certExpiry: "2025-11-20" },
  { id: "S006", employeeId: "LE-006", name: "Karim Hassan", role: "Dispatcher", department: "Operations", station: "CAI", shift: "Night", shiftStart: "22:00", shiftEnd: "06:00", status: "Active", phone: "+201006666666", email: "karim.h@linkegypt.com", joinDate: "2022-04-05", certExpiry: "2025-04-05" },
];

const statusCfg: Record<StaffStatus, string> = {
  Active:     "bg-success/15 text-success",
  "On Leave": "bg-warning/15 text-warning",
  Training:   "bg-info/15 text-info",
  Suspended:  "bg-destructive/15 text-destructive",
};

const shiftCfg: Record<ShiftType, string> = {
  Morning:   "bg-warning/10 text-warning",
  Afternoon: "bg-info/10 text-info",
  Night:     "bg-primary/10 text-primary",
  Split:     "bg-accent/10 text-accent-foreground",
  Off:       "bg-muted text-muted-foreground",
};

const inp = "text-sm border rounded px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

export default function StaffRosterPage() {
  const [staff, setStaff] = useState<StaffMember[]>(sampleStaff);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [stationFilter, setStationFilter] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Partial<StaffMember>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newRow, setNewRow] = useState<Partial<StaffMember>>({ employeeId: "", name: "", role: "Agent", department: "", station: "CAI", shift: "Morning", shiftStart: "", shiftEnd: "", status: "Active", phone: "", email: "", joinDate: new Date().toISOString().slice(0, 10), certExpiry: "" });

  const stations = useMemo(() => [...new Set(staff.map(s => s.station))], [staff]);
  const filtered = useMemo(() => {
    let r = staff;
    if (roleFilter !== "All") r = r.filter(s => s.role === roleFilter);
    if (stationFilter !== "All") r = r.filter(s => s.station === stationFilter);
    if (search) { const s = search.toLowerCase(); r = r.filter(x => x.name.toLowerCase().includes(s) || x.employeeId.toLowerCase().includes(s) || x.department.toLowerCase().includes(s)); }
    return r;
  }, [staff, roleFilter, stationFilter, search]);

  const set = (k: keyof StaffMember, v: any) => setEditRow(p => ({ ...p, [k]: v }));
  const isExpiringSoon = (dateStr: string) => { const d = new Date(dateStr); const now = new Date(); const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24); return diff >= 0 && diff <= 90; };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Users size={22} className="text-primary" /> Staff Roster</h1>
        <p className="text-muted-foreground text-sm mt-1">Ground handling staff scheduling, roles, and certifications</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card"><div className="stat-card-icon bg-primary"><Users size={20} /></div><div><div className="text-2xl font-bold text-foreground">{staff.length}</div><div className="text-xs text-muted-foreground">Total Staff</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-success"><CheckCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{staff.filter(s => s.status === "Active").length}</div><div className="text-xs text-muted-foreground">On Duty</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-warning"><Clock size={20} /></div><div><div className="text-2xl font-bold text-foreground">{staff.filter(s => s.status === "On Leave").length}</div><div className="text-xs text-muted-foreground">On Leave</div></div></div>
        <div className="stat-card"><div className="stat-card-icon bg-destructive"><AlertCircle size={20} /></div><div><div className="text-2xl font-bold text-foreground">{staff.filter(s => isExpiringSoon(s.certExpiry)).length}</div><div className="text-xs text-muted-foreground">Cert Expiring Soon</div></div></div>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold text-foreground mr-auto">Staff Directory</h2>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search name, ID, department…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 pr-3 py-1.5 text-sm border rounded bg-card text-foreground placeholder:text-muted-foreground w-52 focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option>{(["Supervisor","Agent","Dispatcher","Check-In","Ramp","Security","VIP","Admin"] as StaffRole[]).map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={stationFilter} onChange={e => setStationFilter(e.target.value)} className="text-sm border rounded px-2 py-1.5 bg-card text-foreground">
            <option>All</option>{stations.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)} className="toolbar-btn-primary"><Plus size={14} /> Add Staff</button>
        </div>

        {showAdd && (
          <div className="p-4 border-b bg-muted">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
              <input placeholder="Emp. ID (LE-007)" value={newRow.employeeId || ""} onChange={e => setNewRow(p => ({ ...p, employeeId: e.target.value }))} className={inp} />
              <input placeholder="Full Name" value={newRow.name || ""} onChange={e => setNewRow(p => ({ ...p, name: e.target.value }))} className={inp} />
              <select value={newRow.role} onChange={e => setNewRow(p => ({ ...p, role: e.target.value as StaffRole }))} className={inp}>
                {(["Supervisor","Agent","Dispatcher","Check-In","Ramp","Security","VIP","Admin"] as StaffRole[]).map(r => <option key={r}>{r}</option>)}
              </select>
              <input placeholder="Department" value={newRow.department || ""} onChange={e => setNewRow(p => ({ ...p, department: e.target.value }))} className={inp} />
              <input placeholder="Station" value={newRow.station || ""} onChange={e => setNewRow(p => ({ ...p, station: e.target.value }))} className={inp} />
              <select value={newRow.shift} onChange={e => setNewRow(p => ({ ...p, shift: e.target.value as ShiftType }))} className={inp}>
                <option>Morning</option><option>Afternoon</option><option>Night</option><option>Split</option><option>Off</option>
              </select>
              <input placeholder="Phone" value={newRow.phone || ""} onChange={e => setNewRow(p => ({ ...p, phone: e.target.value }))} className={inp} />
              <div className="flex gap-1">
                <button onClick={() => { if (!newRow.name) return; setStaff(p => [...p, { ...newRow, id: `S${String(Date.now()).slice(-4)}` } as StaffMember]); setShowAdd(false); setNewRow({ role: "Agent", station: "CAI", shift: "Morning", status: "Active", joinDate: new Date().toISOString().slice(0, 10) }); }} className="toolbar-btn-success text-xs py-1">Save</button>
                <button onClick={() => setShowAdd(false)} className="toolbar-btn-outline text-xs py-1"><X size={12} /></button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>{["EMP ID","NAME","ROLE","DEPARTMENT","STATION","SHIFT","SHIFT HOURS","STATUS","PHONE","CERT EXPIRY","ACTIONS"].map(h => <th key={h} className="data-table-header px-3 py-3 text-left whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16"><Database size={40} className="mx-auto text-muted-foreground/30 mb-3" /><p className="font-semibold text-foreground">No Staff Found</p></td></tr>
              ) : filtered.map(row => (
                <tr key={row.id} className="data-table-row">
                  {editingId === row.id ? (
                    <>
                      <td className="px-2 py-2"><input value={editRow.employeeId || ""} onChange={e => set("employeeId", e.target.value)} className={inp + " w-20"} /></td>
                      <td className="px-2 py-2"><input value={editRow.name || ""} onChange={e => set("name", e.target.value)} className={inp + " w-32"} /></td>
                      <td className="px-2 py-2"><select value={editRow.role} onChange={e => set("role", e.target.value)} className={inp}>{(["Supervisor","Agent","Dispatcher","Check-In","Ramp","Security","VIP","Admin"] as StaffRole[]).map(r => <option key={r}>{r}</option>)}</select></td>
                      <td className="px-2 py-2"><input value={editRow.department || ""} onChange={e => set("department", e.target.value)} className={inp + " w-28"} /></td>
                      <td className="px-2 py-2"><input value={editRow.station || ""} onChange={e => set("station", e.target.value)} className={inp + " w-14"} /></td>
                      <td className="px-2 py-2"><select value={editRow.shift} onChange={e => set("shift", e.target.value as ShiftType)} className={inp}><option>Morning</option><option>Afternoon</option><option>Night</option><option>Split</option><option>Off</option></select></td>
                      <td className="px-2 py-2 text-muted-foreground text-xs">{editRow.shiftStart}–{editRow.shiftEnd}</td>
                      <td className="px-2 py-2"><select value={editRow.status} onChange={e => set("status", e.target.value as StaffStatus)} className={inp}><option>Active</option><option>On Leave</option><option>Training</option><option>Suspended</option></select></td>
                      <td className="px-2 py-2"><input value={editRow.phone || ""} onChange={e => set("phone", e.target.value)} className={inp + " w-32"} /></td>
                      <td className="px-2 py-2"><input type="date" value={editRow.certExpiry || ""} onChange={e => set("certExpiry", e.target.value)} className={inp + " w-32"} /></td>
                      <td className="px-2 py-2 flex gap-1">
                        <button onClick={() => { setStaff(p => p.map(r => r.id === editingId ? { ...r, ...editRow } as StaffMember : r)); setEditingId(null); }} className="text-xs text-success hover:underline">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-destructive hover:underline">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-primary">{row.employeeId}</td>
                      <td className="px-3 py-2.5 font-semibold text-foreground">{row.name}</td>
                      <td className="px-3 py-2.5"><span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">{row.role}</span></td>
                      <td className="px-3 py-2.5 text-foreground text-xs">{row.department}</td>
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground">{row.station}</td>
                      <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${shiftCfg[row.shift]}`}>{row.shift}</span></td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{row.shiftStart}–{row.shiftEnd}</td>
                      <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg[row.status]}`}>{row.status}</span></td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{row.phone}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-medium ${isExpiringSoon(row.certExpiry) ? "text-warning font-bold" : "text-foreground"}`}>
                          {row.certExpiry}{isExpiringSoon(row.certExpiry) && " ⚠️"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 flex gap-1.5">
                        <button onClick={() => { setEditingId(row.id); setEditRow({ ...row }); }} className="text-info hover:text-info/80"><Pencil size={13} /></button>
                        <button onClick={() => setStaff(p => p.filter(r => r.id !== row.id))} className="text-destructive hover:text-destructive/80"><Trash2 size={13} /></button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
