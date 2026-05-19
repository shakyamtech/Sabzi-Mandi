import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, startOfDay, subDays } from "date-fns";

const Reports = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);

  const loadData = () => {
    if (!user) return;
    const since = startOfDay(subDays(new Date(), Number(range))).toISOString();
    Promise.all([
      supabase.from("sales").select("created_at,total,cost_total").gte("created_at", since),
      supabase.from("cash_transactions").select("created_at,amount").eq("direction", "out").in("category", ["expense", "salary", "rent", "electricity", "maintenance"]).gte("created_at", since),
    ]).then(([s, e]) => { setSales(s.data ?? []); setExpenses(e.data ?? []); });
  };

  useEffect(loadData, [user, range]);

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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full max-w-sm mx-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pl">Profit & Loss</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4 shadow-card border-0"><div className="text-xs uppercase text-muted-foreground">Revenue</div><div className="font-display text-xl mt-1">{fmt(totals.revenue)}</div></Card>
            <Card className="p-4 shadow-card border-0"><div className="text-xs uppercase text-muted-foreground">Cost of Goods</div><div className="font-display text-xl mt-1">{fmt(totals.cogs)}</div></Card>
            <Card className="p-4 shadow-card border-0"><div className="text-xs uppercase text-muted-foreground">Gross Profit</div><div className="font-display text-xl mt-1 text-primary">{fmt(totals.gross)}</div></Card>
            <Card className="p-4 shadow-elegant border-0 bg-gradient-primary text-primary-foreground"><div className="text-xs uppercase opacity-80">Net Profit</div><div className="font-display text-xl mt-1">{fmt(totals.net)}</div></Card>
          </div>

          <Card className="p-4 shadow-card border-0">
            <div className="font-display text-lg mb-3">Daily Sales & Profit</div>
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <div className="h-72 min-w-[550px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                    <Bar dataKey="sales" name="Sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="profit" name="Profit" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pl">
          <Card className="shadow-elegant border-0 overflow-hidden">
            <div className="p-6 bg-gradient-primary text-primary-foreground">
              <div className="text-sm opacity-80 uppercase tracking-widest font-bold">Profit & Loss Statement</div>
              <div className="text-xs opacity-60 mt-1">Period: Last {range} days</div>
            </div>
            <div className="p-6 space-y-8 bg-card text-card-foreground">
              {/* Income Section */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider border-b pb-1">Operating Income</h3>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm">Gross Sales (Revenue)</span>
                  <span className="font-medium">{fmt(totals.revenue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t font-bold">
                  <span>Total Income</span>
                  <span className="text-primary underline underline-offset-4 decoration-2">{fmt(totals.revenue)}</span>
                </div>
              </section>

              {/* COGS Section */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold text-accent uppercase tracking-wider border-b pb-1">Cost of Sales</h3>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm">Cost of Goods Sold (COGS)</span>
                  <span className="font-medium text-destructive">({fmt(totals.cogs)})</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t font-bold bg-secondary/30 px-3 -mx-3 rounded-md">
                  <span>GROSS PROFIT</span>
                  <span className="text-primary">{fmt(totals.gross)}</span>
                </div>
              </section>

              {/* Expenses Section */}
              <section className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b pb-1">Operating Expenses</h3>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm">Store Expenses & Bills</span>
                  <span className="font-medium text-destructive">({fmt(totals.exp)})</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t font-bold">
                  <span>Total Expenses</span>
                  <span className="text-destructive">({fmt(totals.exp)})</span>
                </div>
              </section>

              {/* Net Profit Section */}
              <section className="pt-4 border-t-2 border-dashed">
                <div className="flex justify-between items-center p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <div>
                    <div className="text-sm font-bold text-primary uppercase tracking-widest">Net Business Profit</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Calculated as: Gross Profit - Expenses</div>
                  </div>
                  <div className={`text-3xl font-display ${totals.net >= 0 ? "text-primary" : "text-destructive"}`}>
                    {fmt(totals.net)}
                  </div>
                </div>
              </section>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
