import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt, fmtQty } from "@/lib/format";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Product = { id: string; name: string; unit: string; cost_price: number; stock_qty: number };
type Supplier = { id: string; name: string };
type Item = { product_id: string; product_name: string; unit: string; cost_price: number | string; qty: number | string };

const Purchases = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [supplierId, setSupplierId] = useState<string>("none");
  const [paymentMode, setPaymentMode] = useState<"cash" | "credit">("cash");
  const [amountPaid, setAmountPaid] = useState("0");
  const [productPick, setProductPick] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    const [{ data: p }, { data: s }, { data: h }] = await Promise.all([
      supabase.from("products").select("id,name,unit,cost_price,stock_qty").order("name"),
      supabase.from("suppliers").select("id,name").order("name"),
      supabase.from("purchases").select("id,total,amount_paid,payment_mode,supplier_id,created_at,suppliers(name)").order("created_at", { ascending: false }).limit(20),
    ]);
    setProducts((p ?? []) as any); setSuppliers((s ?? []) as any); setHistory(h ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const total = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.cost_price) || 0), 0);

  // Set default amount paid only when total or payment mode changes, 
  // but don't force it if the user is typing or if we are EDITING.
  useEffect(() => {
    if (editingId) return; // Don't auto-fill if we are editing an existing record

    if (paymentMode === "cash") {
      setAmountPaid(total.toFixed(2));
    } else {
      if (Number(amountPaid) === total) setAmountPaid("0");
    }
  }, [paymentMode, editingId]);

  // Update amount paid when items change ONLY if it's a cash purchase and NOT editing
  useEffect(() => {
    if (editingId) return;
    if (paymentMode === "cash") setAmountPaid(total.toFixed(2));
  }, [total, editingId]);

  const addProduct = (id: string) => {
    const p = products.find((x) => x.id === id); if (!p) return;
    if (items.find((i) => i.product_id === id)) return;
    setItems((arr) => [...arr, { product_id: p.id, product_name: p.name, unit: p.unit, cost_price: Number(p.cost_price), qty: 1 }]);
    setProductPick("");
  };
  const updateItem = (id: string, k: "qty" | "cost_price", v: number | string) =>
    setItems((arr) => arr.map((i) => i.product_id === id ? { ...i, [k]: v } : i));
  const removeItem = (id: string) => setItems((arr) => arr.filter((i) => i.product_id !== id));


  const editPurchase = async (p: any) => {
    toast.loading(`Loading items...`, { id: "load-items" });

    // Fetch the items for this purchase
    const { data: pi, error } = await supabase
      .from("purchase_items")
      .select("*")
      .eq("purchase_id", p.id);

    if (error) {
      toast.error(`Database error: ${error.message}`, { id: "load-items" });
      return;
    }

    if (!pi || pi.length === 0) {
      toast.error("No items found! (This purchase was made before the database fix)", { id: "load-items", duration: 5000 });
      return;
    }

    const mappedItems = pi.map((item: any) => ({
      product_id: item.product_id,
      product_name: item.product_name || "Unknown Product",
      unit: item.unit || "kg",
      cost_price: Number(item.cost_price || item.price || 0),
      qty: Number(item.qty || item.quantity || 0)
    }));

    setEditingId(p.id);
    setSupplierId(p.supplier_id || "none");
    setPaymentMode(p.payment_mode);
    setAmountPaid((p.amount_paid || 0).toString());
    setItems(mappedItems);
    setShowForm(true);
    toast.success(`${pi.length} items loaded!`, { id: "load-items" });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async () => {
    if (items.length === 0) return toast.error("Add items");
    if (paymentMode === "credit" && (supplierId === "none" || !supplierId)) return toast.error("Pick a supplier for credit");

    if (editingId) {
      const { error: delErr } = await supabase.rpc("delete_purchase", { p_purchase_id: editingId });
      if (delErr) return toast.error("Failed to update: " + delErr.message);
    }

    const { error } = await supabase.rpc("record_purchase", {
      p_supplier_id: supplierId === "none" || !supplierId ? null : supplierId,
      p_payment_mode: paymentMode, p_amount_paid: Number(amountPaid || 0),
      p_note: editingId ? "Updated purchase" : null, p_items: items.map(i => ({ ...i, qty: Number(i.qty) || 0, cost_price: Number(i.cost_price) || 0 })) as any,
    });
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Purchase updated" : "Purchase recorded");
    setItems([]); setSupplierId("none"); setPaymentMode("cash"); setShowForm(false); setEditingId(null); load();
  };

  const removePurchase = async (id: string) => {
    const { error } = await supabase.rpc("delete_purchase", { p_purchase_id: id });
    if (error) return toast.error(error.message);
    toast.success("Purchase deleted"); load();
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader title="Purchases" subtitle="Stock-in from suppliers" actions={
        <Button onClick={() => {
          setShowForm(!showForm);
          if (showForm) { setEditingId(null); setItems([]); setSupplierId("none"); }
        }} className="bg-gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-1" />{showForm ? "Cancel" : "New Purchase"}
        </Button>
      } />

      {showForm && (
        <Card className="p-4 mb-6 shadow-elegant border-0">
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— none —</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Add product</Label>
              <Select value={productPick} onValueChange={addProduct}>
                <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2.5">
            {items.map((i) => (
              <div key={i.product_id} className="bg-secondary p-3 rounded-xl space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_100px_120px_100px_auto] sm:gap-3 sm:items-center shadow-soft transition-all">
                <div className="flex items-center justify-between sm:justify-start gap-2 border-b sm:border-0 pb-2 sm:pb-0 border-border/40">
                  <div className="font-semibold text-foreground truncate">{i.product_name} <span className="text-xs font-normal text-muted-foreground">/{i.unit}</span></div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 sm:hidden text-destructive hover:bg-destructive/10" onClick={() => removeItem(i.product_id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 items-end sm:contents">
                  <div className="space-y-1 sm:space-y-0">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase sm:hidden block">Qty</Label>
                    <Input className="h-9 font-medium text-xs sm:text-sm bg-background" type="number" step="0.001" value={i.qty} onChange={(e) => updateItem(i.product_id, "qty", e.target.value)} placeholder="Qty" onWheel={(e) => e.currentTarget.blur()} />
                  </div>
                  <div className="space-y-1 sm:space-y-0">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase sm:hidden block">Cost Price</Label>
                    <Input className="h-9 font-medium text-xs sm:text-sm bg-background" type="number" step="0.01" value={i.cost_price} onChange={(e) => updateItem(i.product_id, "cost_price", e.target.value)} placeholder="Price" onWheel={(e) => e.currentTarget.blur()} />
                  </div>
                  <div className="text-right sm:text-right space-y-1 sm:space-y-0">
                    <Label className="text-[10px] font-bold text-primary uppercase sm:hidden block text-right">Total Rs.</Label>
                    <div className="text-sm sm:text-base font-bold text-foreground sm:pt-0 pt-1.5">{fmt((Number(i.qty) || 0) * (Number(i.cost_price) || 0))}</div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="hidden sm:inline-flex h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => removeItem(i.product_id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {items.length === 0 && <div className="text-center text-sm text-muted-foreground py-6 border-2 border-dashed border-border/60 rounded-xl">Pick a product to start</div>}
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-4 items-end">
            <div>
              <Label>Payment</Label>
              <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="credit">Credit</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Amount Paid</Label><Input type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} onWheel={(e) => e.currentTarget.blur()} /></div>
            <div className="flex items-center justify-between bg-gradient-primary text-primary-foreground rounded-lg px-3 py-2">
              <span>Total</span><span className="font-display text-xl">{fmt(total)}</span>
            </div>
          </div>
          <Button onClick={save} className="w-full mt-4 bg-accent text-accent-foreground h-11 font-semibold">Save Purchase</Button>
        </Card>
      )}

      <Card className="shadow-card border-0">
        <div className="p-4 border-b font-display text-lg">Recent Purchases</div>
        <div className="divide-y">
          {history.map((h: any) => (
            <div key={h.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium truncate">{h.suppliers?.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(h.created_at), "dd MMM yyyy, hh:mm a")} · {h.payment_mode}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-medium">{fmt(h.total)}</div>
                <Button size="icon" variant="ghost" onClick={() => editPurchase(h)} className="h-8 w-8 text-muted-foreground"><Pencil className="h-4 w-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this purchase?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Stock will be reduced back, the cash entry removed, and any supplier credit reversed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => removePurchase(h.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {history.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No purchases yet</div>}
        </div>
      </Card>
    </div>
  );
};

export default Purchases;
