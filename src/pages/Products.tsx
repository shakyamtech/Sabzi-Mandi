import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt, fmtQty } from "@/lib/format";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type Product = {
  id: string; name: string; unit: string;
  cost_price: number; sell_price: number; stock_qty: number; low_stock_threshold: number;
};

const blank = { name: "", unit: "kg", cost_price: 0, sell_price: 0, stock_qty: 0, low_stock_threshold: 5 };

const Products = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(blank);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    setItems((data ?? []) as any);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!edit.name.trim()) return toast.error("Name required");
    const payload = { ...edit, user_id: user!.id, name: edit.name.trim() };
    const { error } = edit.id
      ? await supabase.from("products").update(payload).eq("id", edit.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false); setEdit(blank); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Products & Stock"
        subtitle="Manage your vegetables and live stock"
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit(blank); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground shadow-soft"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{edit.id ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Tomato" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Unit</Label>
                    <Select value={edit.unit} onValueChange={(v) => setEdit({ ...edit, unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">gram</SelectItem>
                        <SelectItem value="pcs">pcs</SelectItem>
                        <SelectItem value="bunch">bunch</SelectItem>
                        <SelectItem value="dozen">dozen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Stock Qty</Label><Input type="number" step="0.001" value={edit.stock_qty} onChange={(e) => setEdit({ ...edit, stock_qty: +e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cost Price (Rs.)</Label><Input type="number" step="0.01" value={edit.cost_price} onChange={(e) => setEdit({ ...edit, cost_price: +e.target.value })} /></div>
                  <div><Label>Sell Price (Rs.)</Label><Input type="number" step="0.01" value={edit.sell_price} onChange={(e) => setEdit({ ...edit, sell_price: +e.target.value })} /></div>
                </div>
                <div><Label>Low-stock alert at</Label><Input type="number" step="0.001" value={edit.low_stock_threshold} onChange={(e) => setEdit({ ...edit, low_stock_threshold: +e.target.value })} /></div>
                <Button onClick={save} className="w-full bg-gradient-primary text-primary-foreground">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Input className="mb-4 max-w-sm" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p) => {
          const low = Number(p.stock_qty) <= Number(p.low_stock_threshold);
          return (
            <Card key={p.id} className="p-4 shadow-card border-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-lg">{p.name}</div>
                  <div className="text-xs text-muted-foreground">per {p.unit}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEdit(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div><div className="text-muted-foreground text-xs">Cost</div><div>{fmt(p.cost_price)}</div></div>
                <div><div className="text-muted-foreground text-xs">Sell</div><div className="text-primary font-medium">{fmt(p.sell_price)}</div></div>
              </div>
              <div className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 ${low ? "bg-warning/15 text-warning-foreground" : "bg-secondary"}`}>
                <span className="text-xs">Stock</span>
                <span className="font-medium flex items-center gap-1">
                  {low && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                  {fmtQty(p.stock_qty)} {p.unit}
                </span>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No products yet. Add your first vegetable!</div>}
      </div>
    </div>
  );
};

export default Products;
