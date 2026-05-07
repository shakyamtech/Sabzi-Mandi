import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, startOfDay, subDays } from "date-fns";
import { Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Reports = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);

  const loadData = () => {
    if (!user) return;
    const since = startOfDay(subDays(new Date(), Number(range))).toISOString();
    Promise.all([
      supabase.from("sales").select("created_at,total,cost_total").gte("created_at", since),
      supabase.from("cash_transactions").select("created_at,amount").eq("direction", "out").in("category", ["expense", "salary", "rent", "electricity", "maintenance"]).gte("created_at", since),
      supabase.from("sales").select("id,total,payment_mode,created_at,customers(name)").order("created_at", { ascending: false }).limit(30),
    ]).then(([s, e, r]) => { setSales(s.data ?? []); setExpenses(e.data ?? []); setRecentSales(r.data ?? []); });
  };
  useEffect(loadData, [user, range]);

  const viewSale = async (s: any) => {
    setSelectedSale(s);
    const { data } = await supabase.from("sale_items").select("qty, sell_price, line_total, products(name, unit)").eq("sale_id", s.id);
    setSaleItems(data ?? []);
  };

  const deleteSale = async (id: string) => {
    const { error } = await supabase.rpc("delete_sale", { p_sale_id: id });
    if (error) return toast.error(error.message);
    toast.success("Sale deleted"); loadData();
  };

  const totals = useMemo(() => {
    const revenue = sales.reduce((s, r) => s + Number(r.total), 0);
    const cogs = sales.reduce((s, r) => s + Number(r.cost_total), 0);
    const exp = expenses.reduce((s, r) => s + Number(r.amount), 0);
    return { revenue, cogs, gross: revenue - cogs, exp, net: revenue - cogs - exp };
  }, [sales, expenses]);

  const chartData = useMemo(() => {
    const days = Number(range);
    const map = new Map<string, { day: string; sales: number; profit: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "dd MMM");
      map.set(d, { day: d, sales: 0, profit: 0 });
    }
    sales.forEach((s) => {
      const d = format(new Date(s.created_at), "dd MMM");
      const ex = map.get(d); if (!ex) return;
      ex.sales += Number(s.total); ex.profit += Number(s.total) - Number(s.cost_total);
    });
    return Array.from(map.values());
  }, [sales, range]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <PageHeader title="Reports" subtitle="Sales, profit and expenses" actions={
        <Tabs value={range} onValueChange={(v: any) => setRange(v)}>
          <TabsList><TabsTrigger value="7">7d</TabsTrigger><TabsTrigger value="30">30d</TabsTrigger><TabsTrigger value="90">90d</TabsTrigger></TabsList>
        </Tabs>
      } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Card className="p-4 shadow-card border-0"><div className="text-xs uppercase text-muted-foreground">Revenue</div><div className="font-display text-xl mt-1">{fmt(totals.revenue)}</div></Card>
        <Card className="p-4 shadow-card border-0"><div className="text-xs uppercase text-muted-foreground">Cost of Goods</div><div className="font-display text-xl mt-1">{fmt(totals.cogs)}</div></Card>
        <Card className="p-4 shadow-card border-0"><div className="text-xs uppercase text-muted-foreground">Gross Profit</div><div className="font-display text-xl mt-1 text-primary">{fmt(totals.gross)}</div></Card>
        <Card className="p-4 shadow-elegant border-0 bg-gradient-primary text-primary-foreground"><div className="text-xs uppercase opacity-80">Net Profit</div><div className="font-display text-xl mt-1">{fmt(totals.net)}</div></Card>
      </div>

      <Card className="p-4 shadow-card border-0">
        <div className="font-display text-lg mb-3">Daily Sales & Profit</div>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="profit" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4 mt-4 shadow-card border-0">
        <div className="font-display text-lg">Total Expenses</div>
        <div className="font-display text-3xl text-destructive mt-1">{fmt(totals.exp)}</div>
        <div className="text-xs text-muted-foreground">Recorded via Cashbook (category: expense)</div>
      </Card>

      <Card className="mt-4 shadow-card border-0">
        <div className="p-4 border-b font-display text-lg">Recent Sales</div>
        <div className="divide-y">
          {recentSales.map((s: any) => (
            <div key={s.id} className="p-3 flex items-center justify-between gap-2 hover:bg-muted/50 cursor-pointer transition-smooth group" onClick={() => viewSale(s)}>
              <div className="min-w-0">
                <div className="font-medium truncate group-hover:text-primary transition-colors">{s.customers?.name ?? "Walk-in"}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(s.created_at), "dd MMM yyyy, hh:mm a")} · {s.payment_mode}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-medium">{fmt(s.total)}</div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => viewSale(s)}><Eye className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this sale?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Stock will be restored, the cash entry removed, and any customer credit reversed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSale(s.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
          {recentSales.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No sales yet</div>}
        </div>
      </Card>

      <Dialog open={!!selectedSale} onOpenChange={(o) => !o && setSelectedSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
          </DialogHeader>
          <div className="divide-y">
            {saleItems.map((item, idx) => (
              <div key={idx} className="py-2 flex justify-between items-center">
                <div>
                  <div className="font-medium">{item.products?.name}</div>
                  <div className="text-xs text-muted-foreground">{item.qty} {item.products?.unit} × {fmt(item.sell_price)}</div>
                </div>
                <div className="font-medium">{fmt(item.line_total)}</div>
              </div>
            ))}
            <div className="pt-3 mt-1 flex justify-between items-center font-display text-lg">
              <span>Total</span>
              <span className="text-primary">{fmt(selectedSale?.total)}</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground text-center mt-2">
            ID: {selectedSale?.id} · Mode: {selectedSale?.payment_mode}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
