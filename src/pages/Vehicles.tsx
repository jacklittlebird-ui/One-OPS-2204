import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Car, Plus, Pencil, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { formatDateDMY, cn } from "@/lib/utils";
import { usePagination, TablePagination } from "@/components/ui/table-pagination";

const BASTATEEN = "تأمينات البساتين";

type DriverType = "bastateen_insurance" | "employee";

interface Vehicle {
  id: string;
  plate_no: string;
  make_model: string | null;
  year: number | null;
  station: string | null;
  status: string;
  insured_driver_type: DriverType;
  insured_driver_employee_id: string | null;
  insured_driver_name: string | null;
  insurance_company: string | null;
  insurance_policy_no: string | null;
  insurance_start_date: string | null;
  insurance_end_date: string | null;
  license_expiry_date: string | null;
  notes: string | null;
}

type FormState = {
  id?: string;
  plate_no: string;
  make_model: string;
  year: string;
  station: string;
  status: string;
  insured_driver_type: DriverType;
  insured_driver_employee_id: string | null;
  insurance_company: string;
  insurance_policy_no: string;
  insurance_start_date: string;
  insurance_end_date: string;
  license_expiry_date: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  plate_no: "",
  make_model: "",
  year: "",
  station: "",
  status: "Active",
  insured_driver_type: "bastateen_insurance",
  insured_driver_employee_id: null,
  insurance_company: "",
  insurance_policy_no: "",
  insurance_start_date: "",
  insurance_end_date: "",
  license_expiry_date: "",
  notes: "",
};

const DATE_FIELDS = [
  { value: "insurance_start_date", label: "تاريخ بداية التأمين / Insurance start" },
  { value: "insurance_end_date", label: "تاريخ نهاية التأمين / Insurance end" },
  { value: "license_expiry_date", label: "تاريخ انتهاء الرخصة / License expiry" },
] as const;

export default function VehiclesPage() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [dateField, setDateField] = useState<string>("insurance_end_date");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("vehicles")
        .select("*")
        .order("plate_no", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Vehicle[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["vehicles", "employees-lookup"],
    enabled: !!session,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id,full_name,employee_no,position,status")
        .order("full_name", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const employeeName = (id: string | null) =>
    employees.find((e: any) => e.id === id)?.full_name ?? "";

  const saveMutation = useMutation({
    mutationFn: async (f: FormState) => {
      const payload: any = {
        plate_no: f.plate_no.trim(),
        make_model: f.make_model.trim() || null,
        year: f.year ? Number(f.year) : null,
        station: f.station.trim() || null,
        status: f.status,
        insured_driver_type: f.insured_driver_type,
        insured_driver_employee_id:
          f.insured_driver_type === "employee" ? f.insured_driver_employee_id : null,
        insured_driver_name:
          f.insured_driver_type === "bastateen_insurance"
            ? BASTATEEN
            : employeeName(f.insured_driver_employee_id),
        insurance_company: f.insurance_company.trim() || null,
        insurance_policy_no: f.insurance_policy_no.trim() || null,
        insurance_start_date: f.insurance_start_date || null,
        insurance_end_date: f.insurance_end_date || null,
        license_expiry_date: f.license_expiry_date || null,
        notes: f.notes.trim() || null,
      };
      if (f.id) {
        const { error } = await (supabase.from as any)("vehicles").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("vehicles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      setOpen(false);
      setForm(EMPTY_FORM);
      toast.success("تم حفظ بيانات السيارة");
    },
    onError: (e: any) => toast.error(e.message || "فشل الحفظ"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("تم حذف السيارة");
    },
    onError: (e: any) => toast.error(e.message || "فشل الحذف"),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (term) {
        const hay = [v.plate_no, v.make_model, v.station, v.insured_driver_name, v.insurance_company, v.insurance_policy_no]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (dateFrom || dateTo) {
        const raw = (v as any)[dateField] as string | null;
        if (!raw) return false;
        if (dateFrom && raw < dateFrom) return false;
        if (dateTo && raw > dateTo) return false;
      }
      return true;
    });
  }, [vehicles, search, dateField, dateFrom, dateTo]);

  const pag = usePagination(filtered, { resetKey: filtered.length });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setForm({
      id: v.id,
      plate_no: v.plate_no,
      make_model: v.make_model ?? "",
      year: v.year ? String(v.year) : "",
      station: v.station ?? "",
      status: v.status ?? "Active",
      insured_driver_type: v.insured_driver_type ?? "bastateen_insurance",
      insured_driver_employee_id: v.insured_driver_employee_id,
      insurance_company: v.insurance_company ?? "",
      insurance_policy_no: v.insurance_policy_no ?? "",
      insurance_start_date: v.insurance_start_date ?? "",
      insurance_end_date: v.insurance_end_date ?? "",
      license_expiry_date: v.license_expiry_date ?? "",
      notes: v.notes ?? "",
    });
    setOpen(true);
  };

  const canSave =
    form.plate_no.trim().length > 0 &&
    (form.insured_driver_type === "bastateen_insurance" || !!form.insured_driver_employee_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Car className="h-6 w-6" /> إدارة السيارات — Vehicle Management
          </h1>
          <p className="text-muted-foreground text-sm">
            سجل سيارات الشركة، التأمين، واسم السائق المؤمن عليه
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> إضافة سيارة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بحث وتصفية</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>بحث نصي (لوحة / سائق / تأمين)</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <Label>البحث حسب التاريخ</Label>
            <Select value={dateField} onValueChange={setDateField}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_FIELDS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>من تاريخ</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>إلى تاريخ</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">السيارات ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم اللوحة</TableHead>
                    <TableHead>الماركة / الموديل</TableHead>
                    <TableHead>المحطة</TableHead>
                    <TableHead>اسم السائق المؤمن عليه</TableHead>
                    <TableHead>شركة التأمين</TableHead>
                    <TableHead>بداية التأمين</TableHead>
                    <TableHead>نهاية التأمين</TableHead>
                    <TableHead>انتهاء الرخصة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pag.pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        لا توجد سيارات مطابقة
                      </TableCell>
                    </TableRow>
                  )}
                  {pag.pageRows.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.plate_no}</TableCell>
                      <TableCell>{v.make_model || "—"}{v.year ? ` (${v.year})` : ""}</TableCell>
                      <TableCell>{v.station || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{v.insured_driver_name || "—"}</span>
                          <span className="text-xs text-muted-foreground">
                            {v.insured_driver_type === "bastateen_insurance" ? "تأمينات البساتين" : "موظف بالشركة"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{v.insurance_company || "—"}</TableCell>
                      <TableCell>{v.insurance_start_date ? formatDateDMY(v.insurance_start_date) : "—"}</TableCell>
                      <TableCell>{v.insurance_end_date ? formatDateDMY(v.insurance_end_date) : "—"}</TableCell>
                      <TableCell>{v.license_expiry_date ? formatDateDMY(v.license_expiry_date) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={v.status === "Active" ? "default" : "secondary"}>{v.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEdit(v)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(v.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination {...pag} />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل سيارة" : "إضافة سيارة"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 py-2">
            <div>
              <Label>رقم اللوحة</Label>
              <Input value={form.plate_no} onChange={(e) => setForm({ ...form, plate_no: e.target.value })} />
            </div>
            <div>
              <Label>الماركة / الموديل</Label>
              <Input value={form.make_model} onChange={(e) => setForm({ ...form, make_model: e.target.value })} />
            </div>
            <div>
              <Label>سنة الصنع</Label>
              <Input inputMode="numeric" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div>
              <Label>المحطة</Label>
              <Input value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} />
            </div>

            <div>
              <Label>نوع السائق المؤمن عليه</Label>
              <Select
                value={form.insured_driver_type}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    insured_driver_type: v as DriverType,
                    insured_driver_employee_id: v === "employee" ? form.insured_driver_employee_id : null,
                  })
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bastateen_insurance">تأمينات البساتين</SelectItem>
                  <SelectItem value="employee">اسم موظف بالشركة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>اسم السائق المؤمن عليه</Label>
              {form.insured_driver_type === "bastateen_insurance" ? (
                <Input value={BASTATEEN} readOnly className="bg-muted" />
              ) : (
                <Popover open={driverPickerOpen} onOpenChange={setDriverPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal">
                      {employeeName(form.insured_driver_employee_id) || "اختر موظفاً"}
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="ابحث بالاسم أو الرقم الوظيفي" />
                      <CommandList>
                        <CommandEmpty>لا يوجد موظف مطابق</CommandEmpty>
                        <CommandGroup>
                          {employees.map((e: any) => (
                            <CommandItem
                              key={e.id}
                              value={`${e.full_name} ${e.employee_no ?? ""}`}
                              onSelect={() => {
                                setForm((f) => ({ ...f, insured_driver_employee_id: e.id }));
                                setDriverPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.insured_driver_employee_id === e.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <span className="flex flex-col">
                                <span>{e.full_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {e.employee_no}{e.position ? ` — ${e.position}` : ""}
                                </span>
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div>
              <Label>شركة التأمين</Label>
              <Input value={form.insurance_company} onChange={(e) => setForm({ ...form, insurance_company: e.target.value })} />
            </div>
            <div>
              <Label>رقم بوليصة التأمين</Label>
              <Input value={form.insurance_policy_no} onChange={(e) => setForm({ ...form, insurance_policy_no: e.target.value })} />
            </div>
            <div>
              <Label>تاريخ بداية التأمين</Label>
              <Input type="date" value={form.insurance_start_date} onChange={(e) => setForm({ ...form, insurance_start_date: e.target.value })} />
            </div>
            <div>
              <Label>تاريخ نهاية التأمين</Label>
              <Input type="date" value={form.insurance_end_date} onChange={(e) => setForm({ ...form, insurance_end_date: e.target.value })} />
            </div>
            <div>
              <Label>تاريخ انتهاء الرخصة</Label>
              <Input type="date" value={form.license_expiry_date} onChange={(e) => setForm({ ...form, license_expiry_date: e.target.value })} />
            </div>
            <div>
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Out of Service">Out of Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!canSave || saveMutation.isPending}>
              {saveMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
