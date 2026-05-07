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
import { Plus, ArrowDownCircle, ArrowUpCircle, Wallet, Pencil, Trash2, Printer } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { printHTML, escapeHtml } from "@/lib/print";
import { getShopName } from "@/lib/shop";
import { format } from "date-fns";

const categories = [
  "sale", 
  "purchase", 
  "expense", 
  "salary", 
  "rent", 
  "electricity", 
  "maintenance", 
  "customer_payment", 
  "supplier_payment", 
  "opening", 
  "personal", 
  "other"
];

const Cashbook = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState(""); const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [partyId, setPartyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  const load = async () => {
    const [{ data: tx }, { data: cust }, { data: supp }] = await Promise.all([
      supabase.from("cash_transactions").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("customers").select("id, name").order("name"),
      supabase.from("suppliers").select("id, name").order("name")
    ]);
    setRows(tx ?? []);
    setCustomers(cust ?? []);
    setSuppliers(supp ?? []);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const balance = rows.reduce((s, r) => s + (r.direction === "in" ? Number(r.amount) : -Number(r.amount)), 0);
  const totalIn = rows.filter((r) => r.direction === "in").reduce((s, r) => s + Number(r.amount), 0);
  const totalOut = rows.filter((r) => r.direction === "out").reduce((s, r) => s + Number(r.amount), 0);
  const filtered = rows.filter((r) => filter === "all" || r.direction === filter);

  const resetForm = () => { 
    setEditId(null); setAmount(""); setNote(""); setCategory(""); setDirection("in"); setPartyId(null);
  };

  const openEdit = (r: any) => {
    setEditId(r.id); setDirection(r.direction); setAmount(String(r.amount));
    setCategory(r.category); setNote(r.note ?? ""); setPartyId(r.party_id); setOpen(true);
  };

  const save = async () => {
    if (!amount) return toast.error("Amount required");
    if (!category) return toast.error("Please select a category");
    
    // Get party name if selected
    let pName = null;
    if (partyId) {
      const p = [...customers, ...suppliers].find(x => x.id === partyId);
      if (p) pName = p.name;
    }

    const payload = {
      direction, amount: Number(amount), category, note: note || null,
      party_id: partyId, party_name: pName
    };

    if (editId) {
      const { error } = await supabase.from("cash_transactions").update(payload).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Entry updated");
    } else {
      const { error } = await supabase.from("cash_transactions").insert({
        ...payload, user_id: user!.id,
      });
      if (error) return toast.error(error.message);
      
      // If it's an expense, record it in the expenses table too
      const expenseCategories = ["expense", "salary", "rent", "electricity", "maintenance"];
      if (direction === "out" && expenseCategories.includes(category)) {
        await supabase.from("expenses").insert({ 
          user_id: user!.id, 
          amount: Number(amount), 
          category: category, 
          note: note || (pName ? `${category} - ${pName}` : category)
        });
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

  const printBook = async () => {
    const shopName = await getShopName();
    const rowsHtml = filtered.map((r) => `<tr>
      <td>${format(new Date(r.created_at), "dd MMM, hh:mm a")}</td>
      <td style="text-transform:capitalize">${escapeHtml(r.category.replace("_", " "))}${r.note ? ` — ${escapeHtml(r.note)}` : ""}</td>
      <td style="color:${r.direction === "in" ? "#0a7d3a" : "#b91c1c"}">${r.direction === "in" ? "+" : "−"}${fmt(r.amount)}</td>
    </tr>`).join("");
    const body = `
      <div class="center"><h1 style="font-size:22px">${escapeHtml(shopName)}</h1><h2 style="font-size:16px;font-weight:600">Cashbook</h2><div class="muted">${format(new Date(), "dd MMM yyyy, hh:mm a")}</div></div>
      <hr/>
      <div class="row"><span>Cash In</span><span>${fmt(totalIn)}</span></div>
      <div class="row"><span>Cash Out</span><span>${fmt(totalOut)}</span></div>
      <div class="row total"><span>Balance</span><span>${fmt(balance)}</span></div>
      <table><thead><tr><th>Date</th><th>Detail</th><th>Amount</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    `;
    printHTML("Cashbook", body);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader title="Cashbook" subtitle="All cash in & out" actions={
        <div className="flex gap-2">
        <Button variant="outline" onClick={printBook}><Printer className="h-4 w-4 mr-1" />Print</Button>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={resetForm} className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />New Entry</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit Entry" : "Cash Entry"}</DialogTitle></DialogHeader>
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
                <Select value={category} onValueChange={(v) => { setCategory(v); setPartyId(null); }}>
                  <SelectTrigger><SelectValue placeholder="Select Category..." /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {category === "customer_payment" && (
                <div>
                  <Label>Customer</Label>
                  <Select value={partyId || ""} onValueChange={setPartyId}>
                    <SelectTrigger><SelectValue placeholder="Select Customer..." /></SelectTrigger>
                    <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              {category === "supplier_payment" && (
                <div>
                  <Label>Supplier</Label>
                  <Select value={partyId || ""} onValueChange={setPartyId}>
                    <SelectTrigger><SelectValue placeholder="Select Supplier..." /></SelectTrigger>
                    <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              <div><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
              <Button onClick={save} className="w-full bg-gradient-primary text-primary-foreground">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
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
            <div className="flex-1 min-w-0">
              <div className="font-medium capitalize">
                {r.party_name ? `${r.party_name}` : r.category.replace("_", " ")}
                {r.party_name && <span className="text-[10px] text-muted-foreground font-normal ml-2 uppercase">({r.category.replace("_", " ")})</span>}
              </div>
              <div className="text-xs text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy, hh:mm a")}{r.note ? ` · ${r.note}` : ""}</div>
            </div>
            <div className={`font-medium ${r.direction === "in" ? "text-success" : "text-destructive"}`}>{r.direction === "in" ? "+" : "-"}{fmt(r.amount)}</div>
            <div className="flex items-center gap-2">
              {r.reference_id && <span className="text-[10px] text-muted-foreground italic px-1">auto</span>}
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                      <AlertDialogDescription>This cash entry will be permanently removed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(r.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No entries</div>}
      </Card>
    </div>
  );
};

export default Cashbook;
