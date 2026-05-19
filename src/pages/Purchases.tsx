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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductUnit, setNewProductUnit] = useState("kg");
  const [newProductCostPrice, setNewProductCostPrice] = useState("0");
  const [newProductSellPrice, setNewProductSellPrice] = useState("0");
  const [newProductStockQty, setNewProductStockQty] = useState("0");
  const [newProductLowStockThreshold, setNewProductLowStockThreshold] = useState("5");
  const [newProductIsManufactured, setNewProductIsManufactured] = useState(false);

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
  const saveNewSupplier = async () => {
    if (!newSupplierName.trim()) return toast.error("Name required");
    const { data, error } = await supabase.from("suppliers").insert({ user_id: user!.id, name: newSupplierName.trim(), phone: newSupplierPhone.trim() || null }).select();
    if (error) return toast.error(error.message);
    toast.success("Supplier added");
    setNewSupplierName(""); setNewSupplierPhone("");
    setSupplierDialogOpen(false);
    await load();
    if (data && data[0]) setSupplierId(data[0].id);
  };

  const saveNewProduct = async () => {
    if (!newProductName.trim()) return toast.error("Name required");
    const { data, error } = await supabase.from("products").insert({ 
      user_id: user!.id, 
      name: newProductName.trim(), 
      unit: newProductUnit,
      cost_price: Number(newProductCostPrice) || 0,
      sell_price: Number(newProductSellPrice) || 0,
      stock_qty: Number(newProductStockQty) || 0,
      low_stock_threshold: Number(newProductLowStockThreshold) || 5,
      is_manufactured: newProductIsManufactured
    }).select();
    if (error) return toast.error(error.message);
    toast.success("Product added");
    setNewProductName("");
    setNewProductUnit("kg");
    setNewProductCostPrice("0");
    setNewProductSellPrice("0");
    setNewProductStockQty("0");
    setNewProductLowStockThreshold("5");
    setNewProductIsManufactured(false);
    setProductDialogOpen(false);
    await load();
    if (data && data[0]) addProduct(data[0].id);
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
              <div className="flex gap-2">
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— none —</SelectItem>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={() => setSupplierDialogOpen(true)} title="Add New Supplier" className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Add product</Label>
              <div className="flex gap-2">
                <Select value={productPick} onValueChange={addProduct}>
                  <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={() => setProductDialogOpen(true)} title="Add New Product" className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
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

      {/* Dialogs */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Supplier</DialogTitle>
            <DialogDescription>Add a new supplier accounts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={newSupplierPhone} onChange={(e) => setNewSupplierPhone(e.target.value)} /></div>
            <Button onClick={saveNewSupplier} className="w-full bg-gradient-primary text-primary-foreground">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Product</DialogTitle>
            <DialogDescription>Add a new vegetable or item to your inventory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} placeholder="Enter vegetable or item name..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unit</Label>
                <Select value={newProductUnit} onValueChange={setNewProductUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                    <SelectItem value="g">gram</SelectItem>
                    <SelectItem value="Ltr">ltr</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="pcs">pcs</SelectItem>
                    <SelectItem value="pkt">packet</SelectItem>
                    <SelectItem value="cup">cup</SelectItem>
                    <SelectItem value="jar">jar</SelectItem>
                    <SelectItem value="dozen">dozen</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Stock Qty</Label>
                <Input type="number" step="0.001" value={newProductStockQty} onChange={(e) => setNewProductStockQty(e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cost Price (Rs.)</Label>
                <Input type="number" step="0.01" value={newProductCostPrice} onChange={(e) => setNewProductCostPrice(e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
              </div>
              <div>
                <Label>Sell Price (Rs.)</Label>
                <Input type="number" step="0.01" value={newProductSellPrice} onChange={(e) => setNewProductSellPrice(e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
              </div>
            </div>
            <div>
              <Label>Low-stock alert at</Label>
              <Input type="number" step="0.001" value={newProductLowStockThreshold} onChange={(e) => setNewProductLowStockThreshold(e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_manufactured_purchases"
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={newProductIsManufactured}
                onChange={(e) => setNewProductIsManufactured(e.target.checked)}
              />
              <Label htmlFor="is_manufactured_purchases" className="cursor-pointer font-medium text-primary">Made in our Shop (Has Recipe)</Label>
            </div>
            <Button onClick={saveNewProduct} className="w-full bg-gradient-primary text-primary-foreground mt-2">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Purchases;
