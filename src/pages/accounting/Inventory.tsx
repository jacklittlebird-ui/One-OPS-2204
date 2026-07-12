import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Boxes, Warehouse, ArrowLeftRight, AlertTriangle } from "lucide-react";

type Item = { id: string; sku: string; name: string; category: string | null; uom: string; standard_cost: number; reorder_level: number; is_active: boolean };
type Wh = { id: string; code: string; name: string; station_code: string | null; is_active: boolean };
type Stock = { warehouse_id: string; warehouse_code: string; item_id: string; sku: string; item_name: string; qty_on_hand: number; avg_cost: number; stock_value: number };
type Movement = { id: string; movement_type: string; item_id: string; warehouse_id: string; qty: number; unit_cost: number; total_cost: number; movement_date: string; notes: string | null };

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Wh[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  const [itemDlg, setItemDlg] = useState(false);
  const [whDlg, setWhDlg] = useState(false);
  const [movDlg, setMovDlg] = useState(false);

  const [itemForm, setItemForm] = useState<Partial<Item>>({ uom: "EA", standard_cost: 0, reorder_level: 0, is_active: true });
  const [whForm, setWhForm] = useState<Partial<Wh>>({ is_active: true });
  const [movForm, setMovForm] = useState<any>({ movement_type: "receipt", qty: 0, unit_cost: 0 });

  const loadAll = async () => {
    const [i, w, s, m] = await Promise.all([
      supabase.from("inventory_items").select("*").order("sku"),
      supabase.from("inventory_warehouses").select("*").order("code"),
      supabase.rpc("get_stock_valuation", { _warehouse_id: null }),
      supabase.from("inventory_movements").select("*").order("movement_date", { ascending: false }).limit(200),
    ]);
    if (i.data) setItems(i.data as any);
    if (w.data) setWarehouses(w.data as any);
    if (s.data) setStock(s.data as any);
    if (m.data) setMovements(m.data as any);
  };

  useEffect(() => { loadAll(); }, []);

  const kpi = useMemo(() => {
    const totalValue = stock.reduce((a, s) => a + Number(s.stock_value || 0), 0);
    const lowStock = items.filter(i => {
      const total = stock.filter(s => s.item_id === i.id).reduce((a, s) => a + Number(s.qty_on_hand), 0);
      return total <= Number(i.reorder_level || 0);
    }).length;
    return { items: items.length, warehouses: warehouses.length, totalValue, lowStock };
  }, [items, warehouses, stock]);

  const saveItem = async () => {
    if (!itemForm.sku || !itemForm.name) return toast.error("SKU and name required");
    const { error } = await supabase.from("inventory_items").upsert(itemForm as any);
    if (error) return toast.error(error.message);
    toast.success("Item saved"); setItemDlg(false); setItemForm({ uom: "EA", standard_cost: 0, reorder_level: 0, is_active: true }); loadAll();
  };
  const saveWh = async () => {
    if (!whForm.code || !whForm.name) return toast.error("Code and name required");
    const { error } = await supabase.from("inventory_warehouses").upsert(whForm as any);
    if (error) return toast.error(error.message);
    toast.success("Warehouse saved"); setWhDlg(false); setWhForm({ is_active: true }); loadAll();
  };
  const saveMov = async () => {
    if (!movForm.item_id || !movForm.warehouse_id || !movForm.qty) return toast.error("Item, warehouse and qty required");
    const { error } = await supabase.rpc("record_inventory_movement", {
      _movement_type: movForm.movement_type,
      _item_id: movForm.item_id,
      _warehouse_id: movForm.warehouse_id,
      _qty: Number(movForm.qty),
      _unit_cost: Number(movForm.unit_cost || 0),
      _counterparty_warehouse_id: movForm.counterparty_warehouse_id || null,
      _reference_type: null, _reference_id: null,
      _notes: movForm.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Movement recorded"); setMovDlg(false);
    setMovForm({ movement_type: "receipt", qty: 0, unit_cost: 0 }); loadAll();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory & Stock Management</h1>
          <p className="text-sm text-muted-foreground">Item master, warehouses, stock levels and movements</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Items</CardTitle><Boxes className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpi.items}</div></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Warehouses</CardTitle><Warehouse className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpi.warehouses}</div></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Stock Value</CardTitle><ArrowLeftRight className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{kpi.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></CardContent></Card>
        <Card><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Low Stock</CardTitle><AlertTriangle className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{kpi.lowStock}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock on Hand</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={movDlg} onOpenChange={setMovDlg}>
              <DialogTrigger asChild><Button>Record Movement</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Inventory Movement</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={movForm.movement_type} onValueChange={v => setMovForm({ ...movForm, movement_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receipt">Receipt (in)</SelectItem>
                        <SelectItem value="issue">Issue (out)</SelectItem>
                        <SelectItem value="transfer_out">Transfer between warehouses</SelectItem>
                        <SelectItem value="adjustment">Adjustment (± qty)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Item</Label>
                    <Select value={movForm.item_id} onValueChange={v => setMovForm({ ...movForm, item_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.sku} — {i.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{movForm.movement_type === "transfer_out" ? "From Warehouse" : "Warehouse"}</Label>
                    <Select value={movForm.warehouse_id} onValueChange={v => setMovForm({ ...movForm, warehouse_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                      <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {movForm.movement_type === "transfer_out" && (
                    <div>
                      <Label>To Warehouse</Label>
                      <Select value={movForm.counterparty_warehouse_id} onValueChange={v => setMovForm({ ...movForm, counterparty_warehouse_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                        <SelectContent>{warehouses.filter(w => w.id !== movForm.warehouse_id).map(w => <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Quantity {movForm.movement_type === "adjustment" ? "(signed)" : ""}</Label><Input type="number" value={movForm.qty} onChange={e => setMovForm({ ...movForm, qty: e.target.value })} /></div>
                    <div><Label>Unit Cost</Label><Input type="number" value={movForm.unit_cost} onChange={e => setMovForm({ ...movForm, unit_cost: e.target.value })} /></div>
                  </div>
                  <div><Label>Notes</Label><Input value={movForm.notes || ""} onChange={e => setMovForm({ ...movForm, notes: e.target.value })} /></div>
                </div>
                <DialogFooter><Button onClick={saveMov}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow><TableHead>Warehouse</TableHead><TableHead>SKU</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Avg Cost</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                <TableBody>
                  {stock.map((s, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{s.warehouse_code}</TableCell>
                      <TableCell className="font-mono">{s.sku}</TableCell>
                      <TableCell>{s.item_name}</TableCell>
                      <TableCell className="text-right">{Number(s.qty_on_hand).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(s.avg_cost).toFixed(4)}</TableCell>
                      <TableCell className="text-right font-medium">{Number(s.stock_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                  {stock.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No stock yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Item</TableHead><TableHead>Warehouse</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit Cost</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
              <TableBody>
                {movements.map(m => {
                  const item = items.find(i => i.id === m.item_id);
                  const wh = warehouses.find(w => w.id === m.warehouse_id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{m.movement_date}</TableCell>
                      <TableCell><Badge variant="outline">{m.movement_type}</Badge></TableCell>
                      <TableCell>{item?.sku} — {item?.name}</TableCell>
                      <TableCell>{wh?.code}</TableCell>
                      <TableCell className="text-right">{Number(m.qty).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{Number(m.unit_cost).toFixed(4)}</TableCell>
                      <TableCell className="text-right">{Number(m.total_cost).toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-muted-foreground">{m.notes}</TableCell>
                    </TableRow>
                  );
                })}
                {movements.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No movements yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={itemDlg} onOpenChange={setItemDlg}>
              <DialogTrigger asChild><Button>New Item</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Item</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>SKU</Label><Input value={itemForm.sku || ""} onChange={e => setItemForm({ ...itemForm, sku: e.target.value })} /></div>
                  <div><Label>UOM</Label><Input value={itemForm.uom || "EA"} onChange={e => setItemForm({ ...itemForm, uom: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Name</Label><Input value={itemForm.name || ""} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} /></div>
                  <div><Label>Category</Label><Input value={itemForm.category || ""} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} /></div>
                  <div><Label>Standard Cost</Label><Input type="number" value={itemForm.standard_cost ?? 0} onChange={e => setItemForm({ ...itemForm, standard_cost: Number(e.target.value) })} /></div>
                  <div><Label>Reorder Level</Label><Input type="number" value={itemForm.reorder_level ?? 0} onChange={e => setItemForm({ ...itemForm, reorder_level: Number(e.target.value) })} /></div>
                  <div><Label>Reorder Qty</Label><Input type="number" value={(itemForm as any).reorder_qty ?? 0} onChange={e => setItemForm({ ...itemForm, reorder_qty: Number(e.target.value) } as any)} /></div>
                </div>
                <DialogFooter><Button onClick={saveItem}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>UOM</TableHead><TableHead className="text-right">Std Cost</TableHead><TableHead className="text-right">Reorder Lvl</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map(i => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => { setItemForm(i); setItemDlg(true); }}>
                    <TableCell className="font-mono">{i.sku}</TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell>{i.category}</TableCell>
                    <TableCell>{i.uom}</TableCell>
                    <TableCell className="text-right">{Number(i.standard_cost).toFixed(4)}</TableCell>
                    <TableCell className="text-right">{Number(i.reorder_level).toLocaleString()}</TableCell>
                    <TableCell>{i.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No items yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={whDlg} onOpenChange={setWhDlg}>
              <DialogTrigger asChild><Button>New Warehouse</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Warehouse</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Code</Label><Input value={whForm.code || ""} onChange={e => setWhForm({ ...whForm, code: e.target.value })} /></div>
                  <div><Label>Station</Label><Input value={whForm.station_code || ""} onChange={e => setWhForm({ ...whForm, station_code: e.target.value })} /></div>
                  <div className="col-span-2"><Label>Name</Label><Input value={whForm.name || ""} onChange={e => setWhForm({ ...whForm, name: e.target.value })} /></div>
                </div>
                <DialogFooter><Button onClick={saveWh}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Station</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {warehouses.map(w => (
                  <TableRow key={w.id} className="cursor-pointer" onClick={() => { setWhForm(w); setWhDlg(true); }}>
                    <TableCell className="font-mono">{w.code}</TableCell>
                    <TableCell>{w.name}</TableCell>
                    <TableCell>{w.station_code}</TableCell>
                    <TableCell>{w.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  </TableRow>
                ))}
                {warehouses.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No warehouses yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
