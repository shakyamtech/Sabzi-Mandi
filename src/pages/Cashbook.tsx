import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmt } from "@/lib/format";
import { Plus, ArrowDownCircle, ArrowUpCircle, Wallet, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";

const categories = ["sale", "purchase", "expense", "customer_payment", "supplier_payment", "opening", "drawing", "other"];

const Cashbook = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState(""); const [note, setNote] = useState("");
  const [category, setCategory] = useState("other");
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  const load = async () => {
    const { data } = await supabase.from("cash_transactions").select("*").order("created_at", { ascending: false }).limit(200);
    setRows(data ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const balance = rows.reduce((s, r) => s + (r.direction === "in" ? Number(r.amount) : -Number(r.amount)), 0);
  const totalIn = rows.filter((r) => r.direction === "in").reduce((s, r) => s + Number(r.amount), 0);
  const totalOut = rows.filter((r) => r.direction === "out").reduce((s, r) => s + Number(r.amount), 0);
  const filtered = rows.filter((r) => filter === "all" || r.direction === filter);

  const resetForm = () => { setEditId(null); setAmount(""); setNote(""); setCategory("other"); setDirection("in"); };

  const openEdit = (r: any) => {
    setEditId(r.id); setDirection(r.direction); setAmount(String(r.amount));
    setCategory(r.category); setNote(r.note ?? ""); setOpen(true);
  };

  const save = async () => {
    if (!amount) return toast.error("Amount required");
    if (editId) {
      const { error } = await supabase.from("cash_transactions").update({
        direction, amount: Number(amount), category, note: note || null,
      }).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Entry updated");
    } else {
      const { error } = await supabase.from("cash_transactions").insert({
        user_id: user!.id, direction, amount: Number(amount), category, note: note || null,
      });
      if (error) return toast.error(error.message);
      if (Number(amount) > 0 && (category === "expense")) {
        await supabase.from("expenses").insert({ user_id: user!.id, amount: Number(amount), category: note || "general", note });
      }
      toast.success("Entry added");
    }
    setOpen(false); resetForm(); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("cash_transactions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Entry deleted"); load();
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader title="Cashbook" subtitle="All cash in & out" actions={
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={resetForm} className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />New Entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cash Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Type</Label>
                <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="in">Cash In</SelectItem><SelectItem value="out">Cash Out</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Amount</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
              <Button onClick={add} className="w-full bg-gradient-primary text-primary-foreground">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card className="p-4 shadow-card border-0"><div className="text-xs text-muted-foreground uppercase">Cash In</div><div className="font-display text-xl text-success mt-1">{fmt(totalIn)}</div></Card>
        <Card className="p-4 shadow-card border-0"><div className="text-xs text-muted-foreground uppercase">Cash Out</div><div className="font-display text-xl text-destructive mt-1">{fmt(totalOut)}</div></Card>
        <Card className="p-4 shadow-elegant border-0 bg-gradient-primary text-primary-foreground"><div className="text-xs uppercase opacity-80 flex items-center gap-1"><Wallet className="h-3 w-3" /> Balance</div><div className="font-display text-xl mt-1">{fmt(balance)}</div></Card>
      </div>

      <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="mb-3">
        <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="in">In</TabsTrigger><TabsTrigger value="out">Out</TabsTrigger></TabsList>
      </Tabs>

      <Card className="shadow-card border-0 divide-y">
        {filtered.map((r) => (
          <div key={r.id} className="p-3 flex items-center gap-3">
            {r.direction === "in" ? <ArrowDownCircle className="h-5 w-5 text-success" /> : <ArrowUpCircle className="h-5 w-5 text-destructive" />}
            <div className="flex-1">
              <div className="font-medium capitalize">{r.category.replace("_", " ")}</div>
              <div className="text-xs text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy, hh:mm a")}{r.note ? ` · ${r.note}` : ""}</div>
            </div>
            <div className={`font-medium ${r.direction === "in" ? "text-success" : "text-destructive"}`}>{r.direction === "in" ? "+" : "-"}{fmt(r.amount)}</div>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No entries</div>}
      </Card>
    </div>
  );
};

export default Cashbook;
