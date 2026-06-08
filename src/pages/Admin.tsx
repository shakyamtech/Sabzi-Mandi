import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Trash2, Pencil, RefreshCw, ShieldOff, RotateCcw, Ban, UserCheck, Search } from "lucide-react";
import { format } from "date-fns";

type AdminUser = {
  id: string; email: string; created_at: string; last_sign_in_at: string | null;
  full_name: string; shop_name: string; roles: string[];
  banned_until?: string | null;
};

const Admin = () => {
  const { isAdmin, loading } = useIsAdmin();
  const { onlineUsers } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editShop, setEditShop] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
    } catch (e: any) { 
      console.error("Admin Load Error:", e);
      toast.error(e.message || "Failed to load users"); 
    }
    setBusy(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (loading) return <div className="p-8">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const saveProfile = async () => {
    if (!editing) return;
    try {
      await call({ action: "update_profile", user_id: editing.id, full_name: editName, shop_name: editShop });
      
      if (editPassword) {
        await call({ action: "change_password", user_id: editing.id, new_password: editPassword });
        toast.success("Profile and password updated successfully");
      } else {
        toast.success("Profile updated successfully");
      }
      
      setEditing(null);
      setEditPassword("");
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

  const toggleBan = async (u: AdminUser) => {
    const currentlyBanned = u.banned_until && new Date(u.banned_until) > new Date();
    try {
      await call({ action: "ban_user", user_id: u.id, ban: !currentlyBanned });
      toast.success(currentlyBanned ? "User access restored" : "User suspended successfully");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const resetData = async (u: AdminUser) => {
    setBusy(true);
    try {
      await call({ action: "reset_user_data", user_id: u.id });
      toast.success(`Data reset successfully for ${u.email}`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to reset user data");
    } finally {
      setBusy(false);
    }
  };






  const sortedUsers = [...users].sort((a, b) => {
    const timeA = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
    const timeB = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
    return timeB - timeA;
  });

  const filteredUsers = sortedUsers.filter((u) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      u.email.toLowerCase().includes(query) ||
      (u.full_name || "").toLowerCase().includes(query) ||
      (u.shop_name || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Admin</h1>
          <p className="text-sm text-muted-foreground">
            {searchQuery 
              ? `${filteredUsers.length} of ${users.length} users` 
              : `${users.length} user${users.length !== 1 ? "s" : ""}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={busy}>
            <RefreshCw className={`h-4 w-4 mr-2 ${busy ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by email, full name, or shop name..."
          className="pl-10 h-11 w-full bg-white/80 dark:bg-emerald-950/30 backdrop-blur-md focus:bg-white dark:focus:bg-emerald-950/50 dark:text-foreground shadow-soft transition-all duration-300 rounded-xl border-sidebar-border/40 focus:ring-primary/20"
        />
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((u) => (
          <Card key={u.id} className="p-4 shadow-card border-0 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {onlineUsers.has(u.id) && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                      </span>
                    )}
                    <span className="font-display font-semibold text-base truncate max-w-full">{u.email}</span>
                  </div>
                  {u.roles.includes("admin") && (
                    <Badge variant="default" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                      <Shield className="h-3 w-3 mr-1" /> admin
                    </Badge>
                  )}
                  {u.banned_until && new Date(u.banned_until) > new Date() && (
                    <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 transition-colors font-bold uppercase tracking-wider text-[10px]">
                      <Ban className="h-3 w-3 mr-1" /> Suspended
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground/80">{u.full_name || "Anonymous User"}</span>
                    <span className="text-muted-foreground/40">|</span>
                    <span className="italic text-primary/70">{u.shop_name || "No Shop Name"}</span>
                  </div>
                  
                  <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                    <span className="flex items-center gap-1">
                      <span className="opacity-50">Joined</span>
                      {format(new Date(u.created_at), "dd MMM yyyy")}
                    </span>
                    {u.last_sign_in_at && (
                      <>
                        <span className="opacity-30 hidden sm:inline">•</span>
                        <span className="flex items-center gap-1">
                          <span className="opacity-50">Active</span>
                          {format(new Date(u.last_sign_in_at), "dd MMM yyyy")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-sidebar-border/50">
                <Dialog open={editing?.id === u.id} onOpenChange={(o) => { if (!o) { setEditing(null); setEditPassword(""); } }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="flex-1 md:flex-none h-9" onClick={() => { setEditing(u); setEditName(u.full_name); setEditShop(u.shop_name); setEditPassword(""); }}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit User Profile</DialogTitle>
                      <DialogDescription>Update profile details or assign a new password for {u.email}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter full name..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Shop Name</Label>
                        <Input value={editShop} onChange={(e) => setEditShop(e.target.value)} placeholder="Enter shop name..." />
                      </div>
                      <div className="space-y-2 border-t pt-4">
                        <Label>Set New Password</Label>
                        <Input 
                          type="password" 
                          value={editPassword} 
                          onChange={(e) => setEditPassword(e.target.value)} 
                          placeholder="Leave blank to keep unchanged..." 
                        />
                        <p className="text-[10px] text-muted-foreground">Min 6 characters. This will override their current password immediately.</p>
                      </div>
                      <Button onClick={saveProfile} className="w-full bg-primary text-primary-foreground h-11 font-semibold">Save Changes</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  size="sm" 
                  variant="outline" 
                  className={`flex-1 md:flex-none h-9 transition-all ${u.roles.includes("admin") ? "border-orange-200 text-orange-600 hover:bg-orange-50" : "border-primary/20 text-primary hover:bg-primary/5"}`}
                  onClick={() => toggleAdmin(u)}
                >
                  {u.roles.includes("admin") ? <><ShieldOff className="h-3.5 w-3.5 mr-1.5" /> Revoke</> : <><Shield className="h-3.5 w-3.5 mr-1.5" /> Make Admin</>}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className={`flex-1 md:flex-none h-9 transition-all ${
                        u.banned_until && new Date(u.banned_until) > new Date() 
                          ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" 
                          : "border-destructive/20 text-destructive hover:bg-destructive/5"
                      }`}
                    >
                      {u.banned_until && new Date(u.banned_until) > new Date() ? (
                        <><UserCheck className="h-3.5 w-3.5 mr-1.5" /> Unban</>
                      ) : (
                        <><Ban className="h-3.5 w-3.5 mr-1.5" /> Ban User</>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {u.banned_until && new Date(u.banned_until) > new Date() 
                          ? `Unban user ${u.email}?` 
                          : `Ban user ${u.email}?`
                        }
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {u.banned_until && new Date(u.banned_until) > new Date() 
                          ? "This will restore the user's access to the application immediately." 
                          : "This will immediately terminate all active sessions on their devices and permanently block them from logging back in or signing up again. You can lift this suspension at any time."
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => toggleBan(u)} 
                        className={u.banned_until && new Date(u.banned_until) > new Date() ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-destructive text-destructive-foreground"}
                      >
                        {u.banned_until && new Date(u.banned_until) > new Date() ? "Restore Access" : "Suspend User"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 md:flex-none h-9 border-amber-200 text-amber-600 hover:bg-amber-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset data for {u.email}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all <strong>sales</strong>, <strong>purchases</strong>, <strong>cash transactions</strong>, <strong>ledger entries</strong>, and <strong>expenses</strong> for this user.
                        <br /><br />
                        <strong>What remains:</strong> Product catalog will be kept intact. Customer and Supplier lists will be preserved, but their ledger balances will be reset to 0. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => resetData(u)} className="bg-amber-600 hover:bg-amber-700 text-white">Reset Ledger & Sales</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="flex-1 md:flex-none h-9 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
                      <AlertDialogAction onClick={() => del(u)} className="bg-destructive text-destructive-foreground">Delete User</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}
        {!filteredUsers.length && !busy && (
          <Card className="p-12 text-center text-muted-foreground bg-secondary/30 border-2 border-dashed border-sidebar-border">
            <RefreshCw className="h-8 w-8 mx-auto mb-3 opacity-20" />
            {searchQuery ? "No users matching your search." : "No users found in the system."}
          </Card>
        )}
      </div>
    </div>
  );
};

export default Admin;
