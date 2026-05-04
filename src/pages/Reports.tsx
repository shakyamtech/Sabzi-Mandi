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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Reports = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  const loadData = () => {
    if (!user) return;
    const since = startOfDay(subDays(new Date(), Number(range))).toISOString();
    Promise.all([
      supabase.from("sales").select("created_at,total,cost_total").gte("created_at", since),
      supabase.from("expenses").select("created_at,amount").gte("created_at", since),
      supabase.from("sales").select("id,total,payment_mode,created_at,customers(name)").order("created_at", { ascending: false }).limit(30),
    ]).then(([s, e, r]) => { setSales(s.data ?? []); setExpenses(e.data ?? []); setRecentSales(r.data ?? []); });
  };
  useEffect(loadData, [user, range]);

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
    </div>
  );
};

export default Reports;
