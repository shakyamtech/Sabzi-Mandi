import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  BookOpen, Wallet, BarChart3, FileSpreadsheet, LogOut, Sprout, Shield, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/pos", label: "POS Billing", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/purchases", label: "Purchases", icon: BookOpen },
  { to: "/cashbook", label: "Cashbook", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/balance-sheet", label: "Balance Sheet", icon: FileSpreadsheet },
];

export const AppShell = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
    const [shopName, setShopName] = useState("My Shop");
    const [newName, setNewName] = useState("");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const navItems = isAdmin ? [...nav, { to: "/admin", label: "Admin", icon: Shield }] : nav;

    useEffect(() => {
        if (!user) {
            setShopName("My Shop");
            return;
        }
        supabase.from("profiles").select("shop_name, full_name").eq("id", user.id).maybeSingle()
            .then(({ data }) => { 
                if (data) {
                    setShopName(data.shop_name || "My Shop");
                    setNewName(data.shop_name || "My Shop");
                    setFullName(data.full_name || "");
                }
            });
    }, [user]);

    const handleUpdateProfile = async (type: "info" | "password") => {
        if (!password) return toast.error("Please enter your current password to confirm");
        
        setBusy(true);
        // Verify current password
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user?.email || "",
            password: password
        });

        if (authError) {
            setBusy(false);
            return toast.error("Invalid current password. Please try again.");
        }

        if (type === "info") {
            if (!newName.trim()) { setBusy(false); return toast.error("Shop name cannot be empty"); }
            const { error } = await supabase.from("profiles").update({ 
                shop_name: newName,
                full_name: fullName 
            }).eq("id", user?.id);
            
            if (error) toast.error(error.message);
            else {
                setShopName(newName);
                toast.success("Profile updated!");
                setSettingsOpen(false);
            }
        } else if (type === "password") {
            if (newPassword.length < 6) { setBusy(false); return toast.error("New password must be at least 6 characters"); }
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) toast.error(error.message);
            else {
                toast.success("Password changed successfully!");
                setNewPassword("");
            }
        }

        setBusy(false);
        setPassword("");
    };

    return (
        <div className="flex min-h-screen bg-background">
            <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
                <div className="px-6 py-6 border-b border-sidebar-border">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
                            <Sprout className="h-5 w-5 text-sidebar-primary-foreground" />
                        </div>
                        <div>
                            <div className="font-display text-lg leading-tight">Sabzi</div>
                            <div className="flex items-center gap-1.5">
                                <div className="text-xs text-sidebar-foreground/60 truncate max-w-[140px]">{shopName}</div>
                                <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                                    <DialogTrigger asChild>
                                        <button className="text-sidebar-foreground/40 hover:text-sidebar-primary transition-colors">
                                            <Settings className="h-3 w-3" />
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Account Settings</DialogTitle></DialogHeader>
                                        <div className="space-y-6 py-2">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Full Name</Label>
                                                    <Input 
                                                        value={fullName} 
                                                        onChange={(e) => setFullName(e.target.value)} 
                                                        placeholder="Your full name"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Shop Name</Label>
                                                    <Input 
                                                        value={newName} 
                                                        onChange={(e) => setNewName(e.target.value)} 
                                                        placeholder="E.g. Sharma Vegetable Mart"
                                                    />
                                                </div>
                                                <div className="space-y-2 pt-2 border-t">
                                                    <Label>Change Password (Optional)</Label>
                                                    <Input 
                                                        type="password"
                                                        value={newPassword} 
                                                        onChange={(e) => setNewPassword(e.target.value)} 
                                                        placeholder="Enter NEW password"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-2 border-t">
                                                <Label className="text-primary font-bold">Confirm with Current Password</Label>
                                                <Input 
                                                    type="password"
                                                    value={password} 
                                                    onChange={(e) => setPassword(e.target.value)} 
                                                    placeholder="Enter your CURRENT password"
                                                />
                                                <p className="text-[10px] text-muted-foreground">Required for any account changes.</p>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button 
                                                    className="flex-1 bg-gradient-primary text-primary-foreground"
                                                    onClick={() => handleUpdateProfile("info")}
                                                    disabled={busy}
                                                >
                                                    {busy ? "Updating..." : "Save Profile Info"}
                                                </Button>
                                                <Button 
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => handleUpdateProfile("password")}
                                                    disabled={busy || !newPassword}
                                                >
                                                    Update Password
                                                </Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>
                </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`
              }
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={async () => { await signOut(); navigate("/auth"); }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-sidebar-primary" />
          <span className="font-display text-lg">Sabzi</span>
        </div>
        <Button size="sm" variant="ghost" onClick={async () => { await signOut(); navigate("/auth"); }}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground border-t border-sidebar-border grid grid-cols-5">
        {navItems.slice(0, 5).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-[10px] ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70"}`}>
            <n.icon className="h-4 w-4" />{n.label.split(" ")[0]}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
};


