import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { fmt } from "@/lib/format";

const Row = ({ label, value, bold }: { label: string; value: number; bold?: boolean }) => (
  <div className={`flex justify-between py-2 ${bold ? "font-display text-base border-t pt-3 mt-2" : "text-sm"}`}>
    <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
    <span>{fmt(value)}</span>
  </div>
);

const BalanceSheet = () => {
  const { user } = useAuth();
  const [d, setD] = useState({ cash: 0, stock: 0, receivable: 0, payable: 0, revenue: 0, cogs: 0, expenses: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: cash }, { data: products }, { data: customers }, { data: suppliers }, { data: sales }, { data: exps }] = await Promise.all([
        supabase.from("cash_transactions").select("direction,amount"),
        supabase.from("products").select("stock_qty,cost_price"),
        supabase.from("customers").select("balance"),
        supabase.from("suppliers").select("balance"),
        supabase.from("sales").select("total,cost_total"),
        supabase.from("expenses").select("amount"),
      ]);
      const cashBal = (cash ?? []).reduce((s, r: any) => s + (r.direction === "in" ? +r.amount : -r.amount), 0);
      const stock = (products ?? []).reduce((s, r: any) => s + +r.stock_qty * +r.cost_price, 0);
      const receivable = (customers ?? []).reduce((s, r: any) => s + Math.max(0, +r.balance), 0);
      const payable = (suppliers ?? []).reduce((s, r: any) => s + Math.max(0, +r.balance), 0);
      const revenue = (sales ?? []).reduce((s, r: any) => s + +r.total, 0);
      const cogs = (sales ?? []).reduce((s, r: any) => s + +r.cost_total, 0);
      const expenses = (exps ?? []).reduce((s, r: any) => s + +r.amount, 0);
      setD({ cash: cashBal, stock, receivable, payable, revenue, cogs, expenses });
    })();
  }, [user]);

  const totalAssets = d.cash + d.stock + d.receivable;
  const grossProfit = d.revenue - d.cogs;
  const netProfit = grossProfit - d.expenses;
  const totalLiabilitiesAndEquity = d.payable + netProfit;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader title="Final Account & Balance Sheet" subtitle="A snapshot of your shop's finances" />

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 shadow-card border-0">
          <div className="font-display text-xl mb-2 text-primary">Profit & Loss</div>
          <Row label="Sales Revenue" value={d.revenue} />
          <Row label="Cost of Goods Sold" value={-d.cogs} />
          <Row label="Gross Profit" value={grossProfit} bold />
          <Row label="Operating Expenses" value={-d.expenses} />
          <Row label="Net Profit" value={netProfit} bold />
        </Card>

        <Card className="p-5 shadow-card border-0">
          <div className="font-display text-xl mb-2 text-primary">Balance Sheet</div>
          <div className="text-xs uppercase text-muted-foreground mt-2">Assets</div>
          <Row label="Cash in Hand" value={d.cash} />
          <Row label="Stock (at cost)" value={d.stock} />
          <Row label="Customer Receivables" value={d.receivable} />
          <Row label="Total Assets" value={totalAssets} bold />

          <div className="text-xs uppercase text-muted-foreground mt-4">Liabilities & Equity</div>
          <Row label="Supplier Payables" value={d.payable} />
          <Row label="Owner's Equity (Net Profit)" value={netProfit} />
          <Row label="Total" value={totalLiabilitiesAndEquity} bold />
        </Card>
      </div>

      <Card className="p-4 mt-4 shadow-card border-0 bg-gradient-fresh">
        <div className="text-sm text-foreground/80">
          📒 Note: This is a simplified account derived from your recorded sales, purchases, cash and stock.
          For tax filing, consult an accountant.
        </div>
      </Card>
    </div>
  );
};

export default BalanceSheet;
