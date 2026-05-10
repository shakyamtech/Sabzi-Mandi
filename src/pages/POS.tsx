import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt, fmtQty } from "@/lib/format";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { printHTML, escapeHtml } from "@/lib/print";
import { getShopInfo } from "@/lib/shop";

type Product = { id: string; name: string; unit: string; cost_price: number; sell_price: number; stock_qty: number };
type Customer = { id: string; name: string };
type CartItem = { product_id: string; product_name: string; unit: string; sell_price: number; cost_price: number; qty: number };

const POS = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState<string>("walk-in");
  const [paymentMode, setPaymentMode] = useState<"cash" | "credit">("cash");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [tendered, setTendered] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("customers").select("id,name").order("name"),
    ]);
    setProducts((p ?? []) as any); setCustomers((c ?? []) as any);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const filtered = useMemo(() => products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())), [products, search]);

  const addToCart = (p: Product) => {
    setCart((c) => {
      const ex = c.find((i) => i.product_id === p.id);
      if (ex) return c.map((i) => i.product_id === p.id ? { ...i, qty: +(i.qty + 1).toFixed(3) } : i);
      return [...c, { product_id: p.id, product_name: p.name, unit: p.unit, sell_price: Number(p.sell_price), cost_price: Number(p.cost_price), qty: 1 }];
    });
  };
  const setQty = (id: string, qty: number) => setCart((c) => c.map((i) => i.product_id === id ? { ...i, qty } : i).filter((i) => i.qty > 0));
  const setPrice = (id: string, sell_price: number) => setCart((c) => c.map((i) => i.product_id === id ? { ...i, sell_price } : i));
  const removeItem = (id: string) => setCart((c) => c.filter((i) => i.product_id !== id));

  const subtotal = cart.reduce((s, i) => s + i.qty * i.sell_price, 0);
  const discountNum = Math.max(0, Math.min(Number(discount || 0), subtotal));
  const total = +(subtotal - discountNum).toFixed(2);

  useEffect(() => {
    if (paymentMode === "cash") setAmountPaid(total.toFixed(2));
    else if (paymentMode === "credit") setAmountPaid("0");
  }, [paymentMode, total]);

  const checkout = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    const paid = Number(amountPaid || 0);
    if (paymentMode === "credit" && customerId === "walk-in") return toast.error("Pick a customer for credit sale");
    setBusy(true);
    const ratio = subtotal > 0 ? total / subtotal : 1;
    const itemsToSend = cart.map((i) => ({ ...i, sell_price: +(i.sell_price * ratio).toFixed(4) }));
    const noteWithDiscount = discountNum > 0 ? `Discount: ${fmt(discountNum)}` : null;
    const { error } = await supabase.rpc("checkout_sale", {
      p_customer_id: customerId === "walk-in" ? null : customerId,
      p_payment_mode: paymentMode,
      p_amount_paid: paid,
      p_note: noteWithDiscount,
      p_items: itemsToSend as any,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Sale complete — ${fmt(total)}`);
    const change = Number(tendered || 0) - paid;
    if (paymentMode === "cash" && change > 0) toast.success(`Return change: ${fmt(change)}`);

    // Build & print receipt
    const shop = await getShopInfo();
    const customerName = customerId === "walk-in" ? "Walk-in" : (customers.find((c) => c.id === customerId)?.name ?? "Walk-in");
    const rows = cart.map((i) => `<tr><td>${escapeHtml(i.product_name)}</td><td>${fmtQty(i.qty)} ${escapeHtml(i.unit)}</td><td>${fmt(i.sell_price)}</td><td>${fmt(i.qty * i.sell_price)}</td></tr>`).join("");
    const changeLine = paymentMode === "cash" && Number(tendered || 0) >= total
      ? `<div class="row"><span>Tendered</span><span>${fmt(Number(tendered))}</span></div><div class="row"><span>Change</span><span>${fmt(Number(tendered) - total)}</span></div>` : "";
    
    const body = `
      <div class="center">
        <h2>${escapeHtml(shop.name)}</h2>
        ${shop.pan ? `<div class="muted">PAN: ${escapeHtml(shop.pan)}</div>` : ""}
        <div class="muted" style="margin-top: 4px">${format(new Date(), "dd MMM yyyy, hh:mm a")}</div>
      </div>
      <hr/>
      <div class="row"><span>Customer</span><span>${escapeHtml(customerName)}</span></div>
      <div class="row"><span>Payment</span><span>${paymentMode}</span></div>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
      ${discountNum > 0 ? `<div class="row sub" style="margin-top:8px"><span>Subtotal</span><span>${fmt(subtotal)}</span></div><div class="row sub"><span>Discount</span><span>− ${fmt(discountNum)}</span></div>` : ""}
      <div class="row total"><span>TOTAL</span><span>${fmt(total)}</span></div>
      <div class="row sub"><span>Paid</span><span>${fmt(paid)}</span></div>
      ${changeLine}
      <hr/><div class="center muted">Thank you for shopping with us!</div>
    `;
    printHTML("Receipt", body);

    setCart([]); setAmountPaid(""); setTendered(""); setDiscount(""); setCustomerId("walk-in"); setPaymentMode("cash");
    load();
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <PageHeader title="POS Billing" subtitle="Tap items, take payment, done." />

      <div className="grid lg:grid-cols-[1fr_400px] gap-4">
        <div>
          <Input className="mb-3" placeholder="Search vegetable..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => addToCart(p)}
                className={`text-left p-3 rounded-xl shadow-card hover:shadow-elegant transition-smooth border active:scale-95 ${
                  p.stock_qty < 5 
                    ? "bg-red-50 border-red-200" 
                    : "bg-card border-transparent"
                }`}>
                <div className={`font-display text-base truncate ${p.stock_qty < 5 ? "text-red-900" : ""}`}>{p.name}</div>
                <div className={`text-xs ${p.stock_qty < 5 ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                  {p.stock_qty <= 0 ? "OUT OF STOCK" : `${fmtQty(p.stock_qty)} ${p.unit} left`}
                </div>
                <div className={`mt-2 font-semibold ${p.stock_qty < 5 ? "text-red-700" : "text-primary"}`}>{fmt(p.sell_price)}</div>
              </button>
            ))}
            {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-8">No products. Add some first.</div>}
          </div>
        </div>

        <Card className="p-4 shadow-elegant border-0 lg:sticky lg:top-4 h-fit">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <div className="font-display text-xl">Cart</div>
            <div className="ml-auto text-sm text-muted-foreground">{cart.length} item(s)</div>
          </div>

          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {cart.map((i) => (
              <div key={i.product_id} className="bg-secondary rounded-lg p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{i.product_name}</div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(i.product_id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.product_id, +(i.qty - 0.5).toFixed(3))}><Minus className="h-3 w-3" /></Button>
                    <Input className="h-7 w-16 text-center" type="number" step="0.001" value={i.qty} onChange={(e) => setQty(i.product_id, +e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.product_id, +(i.qty + 0.5).toFixed(3))}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <Input className="h-7" type="number" step="0.01" value={i.sell_price} onChange={(e) => setPrice(i.product_id, +e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
                  <div className="text-right font-medium text-sm w-20">{fmt(i.qty * i.sell_price)}</div>
                </div>
              </div>
            ))}
            {cart.length === 0 && <div className="text-center text-muted-foreground text-sm py-6">Tap a product to add</div>}
          </div>

          <div className="my-3 border-t pt-3 space-y-2">
            <div>
              <Label className="text-xs">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Payment</Label>
                <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit">Credit (Udhaar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Amount Paid</Label>
                <Input type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
              </div>
            </div>
            {paymentMode === "cash" && (
              <div>
                <Label className="text-xs">Cash Received from Customer</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                />
              </div>
            )}
            <div>
              <Label className="text-xs">Discount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
          </div>

          {discountNum > 0 && (
            <div className="space-y-1 mb-2 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>− {fmt(discountNum)}</span></div>
            </div>
          )}

          <div className="flex items-center justify-between bg-gradient-primary text-primary-foreground rounded-xl p-3 mb-3">
            <span className="font-medium">Total</span>
            <span className="font-display text-2xl">{fmt(total)}</span>
          </div>

          {paymentMode === "cash" && Number(tendered || 0) > 0 && (
            <div className="flex items-center justify-between bg-accent/20 border border-accent rounded-xl p-3 mb-3">
              <span className="font-medium text-sm">
                {Number(tendered) >= total ? "Change to Return" : "Short by"}
              </span>
              <span className="font-display text-xl text-black">
                {fmt(Math.abs(Number(tendered) - total))}
              </span>
            </div>
          )}

          <Button disabled={busy || cart.length === 0} onClick={checkout}
            className="w-full bg-accent text-accent-foreground hover:opacity-90 shadow-soft h-12 text-base font-semibold">
            {busy ? "Processing..." : "Complete Sale"}
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default POS;
