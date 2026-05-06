import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Trash2, Pencil, RefreshCw, ShieldOff } from "lucide-react";
import { format } from "date-fns";

type AdminUser = {
  id: string; email: string; created_at: string; last_sign_in_at: string | null;
  full_name: string; shop_name: string; roles: string[];
};

const Admin = () => {
  const { isAdmin, loading } = useIsAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editShop, setEditShop] = useState("");

  const call = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("admin-users", { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const load = async () => {
    setBusy(true);
    try {
      const d = await call({ action: "list" });
      setUsers(d.users || []);
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (loading) return <div className="p-8">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const saveProfile = async () => {
    if (!editing) return;
    try {
      await call({ action: "update_profile", user_id: editing.id, full_name: editName, shop_name: editShop });
      toast.success("Profile updated");
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleAdmin = async (u: AdminUser) => {
    try {
      await call({ action: "set_admin", user_id: u.id, make_admin: !u.roles.includes("admin") });
      toast.success("Role updated");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const del = async (u: AdminUser) => {
    try {
      await call({ action: "delete_user", user_id: u.id });
      toast.success("User deleted");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Admin</h1>
          <p className="text-sm text-muted-foreground">{users.length} user{users.length !== 1 && "s"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={busy}>
          <RefreshCw className={`h-4 w-4 mr-2 ${busy ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid gap-3">
        {users.map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{u.email}</span>
                  {u.roles.includes("admin") && <Badge variant="default">admin</Badge>}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {u.full_name || "—"} · <span className="italic">{u.shop_name || "—"}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Joined {format(new Date(u.created_at), "dd MMM yyyy")}
                  {u.last_sign_in_at && ` · Last seen ${format(new Date(u.last_sign_in_at), "dd MMM yyyy")}`}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Dialog open={editing?.id === u.id} onOpenChange={(o) => !o && setEditing(null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(u); setEditName(u.full_name); setEditShop(u.shop_name); }}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Edit user</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Full name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                      <div><Label>Shop name</Label><Input value={editShop} onChange={(e) => setEditShop(e.target.value)} /></div>
                      <Button onClick={saveProfile} className="w-full">Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button size="sm" variant="outline" onClick={() => toggleAdmin(u)}>
                  {u.roles.includes("admin") ? <><ShieldOff className="h-3 w-3 mr-1" /> Revoke</> : <><Shield className="h-3 w-3 mr-1" /> Make admin</>}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive"><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {u.email}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently deletes the account and ALL their data (sales, products, customers, etc). This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => del(u)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}
        {!users.length && !busy && <Card className="p-8 text-center text-muted-foreground">No users.</Card>}
      </div>
    </div>
  );
};

export default Admin;
