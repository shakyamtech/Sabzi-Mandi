import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  BookOpen, Wallet, BarChart3, FileSpreadsheet, LogOut, Sprout, Shield, Settings,
  Eye, EyeOff, Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    const [panNo, setPanNo] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navItems = isAdmin ? [...nav, { to: "/admin", label: "Admin", icon: Shield }] : nav;

    useEffect(() => {
        if (!user) {
            setShopName("My Shop");
            return;
        }
        
        const loadProfile = async () => {
            const { data, error } = await supabase.from("profiles").select("shop_name, pan_no").eq("id", user.id).maybeSingle();
            
            if (data) {
                setShopName(data.shop_name || "My Shop");
                setNewName(data.shop_name || "My Shop");
                setPanNo(data.pan_no || "");
            } else {
                // If profile missing, try to create it from metadata
                const metaShop = user.user_metadata?.shop_name || "My Shop";
                const metaPan = user.user_metadata?.pan_no || "";
                setShopName(metaShop);
                setNewName(metaShop);
                setPanNo(metaPan);
                
                // Save it to DB so it persists on next refresh
                await supabase.from("profiles").upsert({
                    id: user.id,
                    shop_name: metaShop,
                    full_name: user.user_metadata?.full_name || "",
                    pan_no: metaPan
                });
            }
        };

        loadProfile();
    }, [user]);

    const handleSave = async () => {
        if (!password) return toast.error("Please enter your current password to confirm");
        if (!newName.trim()) return toast.error("Shop name cannot be empty");
        
        setBusy(true);
        // 1. Verify current password
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user?.email || "",
            password: password
        });

        if (authError) {
            setBusy(false);
            return toast.error("Invalid current password. Please try again.");
        }

        try {
            // 2. Update Profile (Name & PAN)
            const { error: profileError } = await supabase.from("profiles").update({ 
                shop_name: newName,
                pan_no: panNo
            }).eq("id", user?.id);
            
            if (profileError) throw profileError;
            setShopName(newName);

            // 3. Update Password if provided
            if (newPassword.trim()) {
                if (newPassword.length < 6) {
                    toast.error("New password must be at least 6 characters. Name updated, but password was not.");
                } else {
                    const { error: passError } = await supabase.auth.updateUser({ password: newPassword });
                    if (passError) throw passError;
                    toast.success("Password updated!");
                    setNewPassword("");
                }
            }

            toast.success("Changes saved successfully!");
            setSettingsOpen(false);
        } catch (err: any) {
            toast.error(err.message || "An error occurred");
        } finally {
            setBusy(false);
            setPassword("");
        }
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
                                <Dialog open={settingsOpen} onOpenChange={(v) => {
                                    setSettingsOpen(v);
                                    if (v) setNewName(shopName);
                                }}>
                                    <DialogTrigger asChild>
                                        <button className="text-sidebar-foreground/40 hover:text-sidebar-primary transition-colors">
                                            <Settings className="h-3 w-3" />
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Account Settings</DialogTitle>
                                            <DialogDescription>Update your shop name, PAN number, or change your password.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-6 py-2">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Shop Name</Label>
                                                    <Input 
                                                        value={newName} 
                                                        onChange={(e) => setNewName(e.target.value)} 
                                                        placeholder="E.g. Sharma Vegetable Mart"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>PAN Number</Label>
                                                    <Input 
                                                        value={panNo} 
                                                        onChange={(e) => setPanNo(e.target.value)} 
                                                        placeholder="Enter PAN number"
                                                        autoComplete="off"
                                                    />
                                                </div>
                                                <div className="space-y-2 pt-2 border-t">
                                                    <Label>Change Password (Optional)</Label>
                                                    <div className="relative">
                                                        <Input 
                                                            type={showNewPassword ? "text" : "password"}
                                                            value={newPassword} 
                                                            onChange={(e) => setNewPassword(e.target.value)} 
                                                            placeholder="Enter NEW password"
                                                            autoComplete="new-password"
                                                            className="pr-10"
                                                        />
                                                        <button 
                                                            type="button"
                                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                                        >
                                                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-2 border-t">
                                                <Label className="text-primary font-bold">Confirm with Current Password</Label>
                                                <div className="relative">
                                                    <Input 
                                                        type={showPassword ? "text" : "password"}
                                                        value={password} 
                                                        onChange={(e) => setPassword(e.target.value)} 
                                                        placeholder="Enter your CURRENT password"
                                                        autoComplete="current-password"
                                                        className="pr-10"
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">Required for any account changes.</p>
                                            </div>

                                            <Button 
                                                className="w-full bg-gradient-primary text-primary-foreground h-11 font-semibold"
                                                onClick={handleSave}
                                                disabled={busy}
                                            >
                                                {busy ? "Saving Changes..." : "Save All Changes"}
                                            </Button>
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
        <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between border-b border-sidebar-border shadow-md">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="h-10 w-10 active:scale-95">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85%] max-w-[300px] p-0 bg-sidebar border-r-sidebar-border flex flex-col [&>button]:text-white [&>button]:opacity-70 hover:[&>button]:opacity-100">
                <div className="px-6 py-8 border-b border-sidebar-border bg-sidebar-accent/30">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-sidebar-primary flex items-center justify-center shadow-lg shrink-0">
                      <Sprout className="h-7 w-7 text-sidebar-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <SheetTitle className="font-display text-xl text-sidebar-foreground">Sabzi</SheetTitle>
                        <span className="text-[9px] text-sidebar-foreground/30 font-black uppercase tracking-widest shrink-0">ver.1.0</span>
                      </div>
                      <div className="text-[11px] font-bold text-sidebar-foreground/60 uppercase tracking-tight truncate mt-0.5">{shopName}</div>
                      <SheetDescription className="sr-only">Mobile menu for Sabzi</SheetDescription>
                    </div>
                  </div>
                </div>
                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                  {navItems.map((n) => (
                    <NavLink key={n.to} to={n.to} end={n.end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-4 px-4 py-4 rounded-xl text-sm font-medium transition-all ${
                          isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                        }`
                      }
                    >
                      <n.icon className="h-5 w-5" /> {n.label}
                    </NavLink>
                  ))}
                </nav>
                <div className="p-6 border-t border-sidebar-border mt-auto">
                  <Button className="w-full justify-start gap-3 h-12 rounded-xl shadow-lg bg-[#FACC15] hover:bg-[#EAB308] text-black border-none font-bold"
                    onClick={async () => { await signOut(); navigate("/auth"); }}>
                    <LogOut className="h-5 w-5" /> Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-display text-xl tracking-tight">Sabzi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[9px] font-black bg-sidebar-primary text-sidebar-primary-foreground px-1.5 py-0.5 rounded uppercase">ver.1.0</div>
            <div className="text-[10px] font-bold bg-sidebar-accent px-2 py-1 rounded text-sidebar-foreground/60 truncate max-w-[150px] uppercase tracking-tighter">{shopName}</div>
          </div>
        </div>

      {/* Mobile bottom nav (Quick Access) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur-md text-sidebar-foreground border-t border-sidebar-border grid grid-cols-4 h-16">
        {[nav[0], nav[1], nav[2], nav[6]].map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 transition-all ${isActive ? "text-sidebar-primary bg-sidebar-accent/30" : "text-sidebar-foreground/40"}`}>
            <n.icon className="h-5 w-5" />
            <span className="text-[9px] font-medium">{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
};


