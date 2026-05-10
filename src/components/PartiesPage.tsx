import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmt } from "@/lib/format";
import { Plus, Trash2, BookOpen, ArrowLeft, Wallet, Printer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { printHTML, escapeHtml } from "@/lib/print";
import { getShopInfo } from "@/lib/shop";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


type Party = { id: string; name: string; phone: string | null; balance: number };
type Entry = { id: string; entry_type: string; amount: number; note: string | null; created_at: string };

export const PartiesPage = ({ type }: { type: "customer" | "supplier" }) => {
  const { user } = useAuth();
  const table = type === "customer" ? "customers" : "suppliers";
  const labelPlural = type === "customer" ? "Customers" : "Suppliers";
  const dueLabel = type === "customer" ? "Receivable (Udhaar)" : "Payable";

  const [items, setItems] = useState<Party[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [selected, setSelected] = useState<Party | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState(""); const [payNote, setPayNote] = useState("");

  const load = async () => {
    const [{ data: p }, { data: l }] = await Promise.all([
      supabase.from(table).select("*").order("name"),
      supabase.from("ledger_entries").select("party_id, entry_type, amount").eq("party_type", type)
    ]);
    
    const parties = (p || []).map((party: any) => {
      const partyEntries = (l || []).filter((e: any) => e.party_id === party.id);
      const balance = partyEntries.reduce((acc: number, e: any) => {
        // For Customers: Sale/Debit increases debt (+), Payment decreases it (-)
        // For Suppliers: Purchase/Credit increases debt (+), Payment decreases it (-)
        const isDebt = ["sale", "purchase", "debit", "credit"].includes(e.entry_type);
        const isPayment = ["payment_in", "payment_out", "payment"].includes(e.entry_type);
        
        if (isDebt) return acc + Number(e.amount);
        if (isPayment) return acc - Number(e.amount);
        return acc;
      }, 0);
      return { ...party, balance };
    });

    setItems(parties);
  };
  useEffect(() => { if (user) load(); }, [user, type]);

  const openLedger = async (p: Party) => {
    setSelected(p);
    const { data } = await supabase.from("ledger_entries").select("*")
      .eq("party_type", type).eq("party_id", p.id).order("created_at", { ascending: false });
    setEntries((data ?? []) as any);
  };

  const add = async () => {
    if (!name.trim()) return toast.error("Name required");
    const { error } = await supabase.from(table).insert({ user_id: user!.id, name: name.trim(), phone: phone.trim() || null });
    if (error) return toast.error(error.message);
    setName(""); setPhone(""); setOpen(false); toast.success("Added"); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from(table).delete().eq("id", id); load();
  };

  const recordPayment = async () => {
    if (!selected || !payAmount) return;
    const { error } = await supabase.rpc("record_party_payment", {
      p_party_type: type, p_party_id: selected.id, p_amount: Number(payAmount), p_note: payNote || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Payment recorded"); setPayOpen(false); setPayAmount(""); setPayNote("");
    openLedger(selected); load();
  };

  if (selected) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setSelected(null)} className="mb-3"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <PageHeader title={selected.name} subtitle={selected.phone ?? ""} actions={
          <div className="flex gap-2">
          <Button variant="outline" onClick={async () => {
            const shop = await getShopInfo();
            const rowsHtml = entries.map((e) => `<tr>
              <td>${format(new Date(e.created_at), "dd MMM, hh:mm a")}</td>
              <td style="text-transform:capitalize">${escapeHtml(e.entry_type.replace("_", " "))}${e.note ? ` — ${escapeHtml(e.note)}` : ""}</td>
              <td>${fmt(e.amount)}</td>
            </tr>`).join("");
            const body = `
              <div class="center">
                <h1 style="font-size:22px; margin-bottom: 4px">${escapeHtml(shop.name)}</h1>
                ${shop.pan ? `<div class="muted">PAN: ${escapeHtml(shop.pan)}</div>` : ""}
                <h2 style="font-size:18px; margin-top: 8px">${escapeHtml(selected.name)}</h2>
                <div class="muted">${type === "customer" ? "Customer" : "Supplier"} Ledger · ${format(new Date(), "dd MMM yyyy")}</div>
              </div>
              <hr/>
              <div class="row total"><span>Outstanding ${dueLabel}</span><span>${fmt(Math.abs(Number(selected.balance)))}</span></div>
              <table><thead><tr><th>Date</th><th>Detail</th><th>Amount</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
            printHTML(`${selected.name} — Ledger`, body);
          }}><Printer className="h-4 w-4 mr-1" />Print</Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-1" /> Clear History
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Ledger History?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete all transaction history for {selected.name}. Only use this if the account is settled.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={async () => {
                  const { error } = await supabase.from("ledger_entries").delete().eq("party_type", type).eq("party_id", selected.id);
                  if (error) return toast.error(error.message);
                  toast.success("History cleared"); openLedger(selected); load();
                }} className="bg-destructive text-destructive-foreground">Clear All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={() => setPayOpen(true)} className="bg-gradient-primary text-primary-foreground">
            <Wallet className="h-4 w-4 mr-1" /> Record Payment
          </Button>
          </div>
        } />
        <Card className="p-5 mb-4 shadow-card border-0">
          <div className="text-xs uppercase text-muted-foreground tracking-wide">
            {Number(selected.balance) >= 0 ? `Outstanding ${dueLabel}` : "Advance / Overpaid"}
          </div>
          <div className={`font-display text-3xl mt-1 ${Number(selected.balance) > 0 ? "text-orange-600" : "text-green-600"}`}>
            {fmt(Math.abs(Number(selected.balance)))}
          </div>
        </Card>
        <Card className="shadow-card border-0">
          <div className="p-4 border-b font-display text-lg flex items-center gap-2"><BookOpen className="h-4 w-4" /> Ledger</div>
          <div className="divide-y">
            {entries.map((e) => (
              <div key={e.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium capitalize">{e.entry_type.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(e.created_at), "dd MMM yyyy, hh:mm a")}{e.note ? ` · ${e.note}` : ""}</div>
                </div>
                <div className={`font-medium ${e.entry_type.includes("payment") ? "text-success" : "text-accent"}`}>{fmt(e.amount)}</div>
              </div>
            ))}
            {entries.length === 0 && <div className="p-6 text-center text-muted-foreground text-sm">No entries yet</div>}
          </div>
        </Card>

        {/* Payment Dialog for Ledger View */}
        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record {type === "customer" ? "Payment Received" : "Payment Made"} — {selected.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Amount</Label><Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus /></div>
              <div><Label>Note</Label><Input value={payNote} placeholder="Optional note" onChange={(e) => setPayNote(e.target.value)} /></div>
              <Button onClick={recordPayment} className="w-full bg-gradient-primary text-primary-foreground">Save Payment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader title={labelPlural} subtitle={`Manage ${type} accounts and ${dueLabel.toLowerCase()}`} actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />Add</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New {type}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <Button onClick={add} className="w-full bg-gradient-primary text-primary-foreground">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((p) => (
          <Card key={p.id} className="p-4 shadow-card border-0 cursor-pointer hover:shadow-elegant transition-smooth" onClick={() => openLedger(p)}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-lg">{p.name}</div>
                {p.phone && <div className="text-xs text-muted-foreground">{p.phone}</div>}
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={(e) => { 
                  e.stopPropagation(); 
                  setSelected(p);
                  setPayOpen(true);
                }}>
                  <Wallet className="h-4 w-4 text-primary" />
                </Button>
                <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); remove(p.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {Number(p.balance) >= 0 ? dueLabel : "Advance"}
              </span>
              <span className={`font-medium ${Number(p.balance) > 0 ? "text-orange-600 font-bold" : "text-green-600"}`}>
                {fmt(Math.abs(Number(p.balance)))}
              </span>
            </div>
          </Card>
        ))}

        {/* Global Payment Dialog (Shared between Card and Ledger views) */}
        <Dialog open={payOpen} onOpenChange={setPayOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record {type === "customer" ? "Payment Received" : "Payment Made"} {selected ? `— ${selected.name}` : ""}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Amount</Label><Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus /></div>
              <div><Label>Note</Label><Input value={payNote} placeholder="Optional note" onChange={(e) => setPayNote(e.target.value)} /></div>
              <Button onClick={recordPayment} className="w-full bg-gradient-primary text-primary-foreground">Save Payment</Button>
            </div>
          </DialogContent>
        </Dialog>
        {items.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No {type}s yet</div>}
      </div>
    </div>
  );
};
