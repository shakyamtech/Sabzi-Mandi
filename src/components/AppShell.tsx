import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  BookOpen, Wallet, BarChart3, FileSpreadsheet, LogOut, Sprout, Shield, Settings,
  Eye, EyeOff, Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    const [fullName, setFullName] = useState("");
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
            const { data, error } = await supabase.from("profiles").select("shop_name, pan_no, full_name").eq("id", user.id).maybeSingle();
            
            if (data) {
                setShopName(data.shop_name || user.user_metadata?.shop_name || "My Shop");
                setNewName(data.shop_name || user.user_metadata?.shop_name || "My Shop");
                setPanNo(data.pan_no || user.user_metadata?.pan_no || "");
                setFullName(data.full_name || user.user_metadata?.full_name || "");
            } else {
                const metaShop = user.user_metadata?.shop_name || "My Shop";
                const metaPan = user.user_metadata?.pan_no || "";
                const metaName = user.user_metadata?.full_name || "";
                setShopName(metaShop);
                setNewName(metaShop);
                setPanNo(metaPan);
                setFullName(metaName);
                
                await supabase.from("profiles").upsert({
                    id: user.id,
                    shop_name: metaShop,
                    full_name: metaName,
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
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user?.email || "",
            password: password
        });

        if (authError) {
            setBusy(false);
            return toast.error("Invalid current password. Please try again.");
        }

        try {
            const { error: profileError } = await supabase.from("profiles").update({ 
                shop_name: newName,
                pan_no: panNo,
                full_name: fullName
            }).eq("id", user?.id);
            
            if (profileError) throw profileError;
            setShopName(newName);

            const updatePayload: any = { data: { full_name: fullName, shop_name: newName, pan_no: panNo } };
            if (newPassword.trim()) {
                if (newPassword.length < 6) {
                    toast.error("New password must be at least 6 characters. Profile updated, but password was not.");
                } else {
                    updatePayload.password = newPassword;
                }
            }
            const { error: authMetaErr } = await supabase.auth.updateUser(updatePayload);
            if (authMetaErr) throw authMetaErr;
            if (updatePayload.password) {
                toast.success("Password updated!");
                setNewPassword("");
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
            <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
                <div className="px-6 py-6 border-b border-sidebar-border">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
                            <Sprout className="h-5 w-5 text-sidebar-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-display text-lg leading-tight">Sabzi</div>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <div className="text-xs text-sidebar-foreground/60 truncate max-w-[120px]">{shopName}</div>
                                <button 
                                    onClick={() => {
                                        setNewName(shopName);
                                        setSettingsOpen(true);
                                    }}
                                    className="text-sidebar-foreground/40 hover:text-sidebar-primary transition-colors shrink-0"
                                >
                                    <Settings className="h-3 w-3" />
                                </button>
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
                <div className="p-3 border-t border-sidebar-border mt-auto">
                    <div className="px-3 py-2 text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest">Version 1.2.0</div>
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
                            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                            <SheetDescription className="sr-only">Quick access links and account management</SheetDescription>
                            <div className="px-6 py-8 border-b border-sidebar-border bg-sidebar-accent/30">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-sidebar-primary flex items-center justify-center shadow-lg shrink-0">
                                        <Sprout className="h-7 w-7 text-sidebar-primary-foreground" />
                                    </div>
                                    <div>
                                        <div className="font-display text-xl leading-tight text-sidebar-foreground">Sabzi</div>
                                        <div className="text-xs text-sidebar-foreground/60 uppercase tracking-tight truncate mt-0.5">{shopName}</div>
                                    </div>
                                </div>
                            </div>
                            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                                {navItems.map((n) => (
                                    <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMobileMenuOpen(false)}
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
                                <div className="px-1 mb-4 text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest">Version 1.2.0</div>
                                <Button className="w-full justify-start gap-3 h-12 rounded-xl shadow-lg bg-[#FACC15] hover:bg-[#EAB308] text-black border-none font-bold"
                                    onClick={async () => { await signOut(); navigate("/auth"); }}>
                                    <LogOut className="h-5 w-5" /> Sign out
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <div className="text-sm font-bold bg-sidebar-accent px-3 py-1.5 rounded-lg text-sidebar-foreground truncate max-w-[220px] uppercase tracking-tight">{shopName}</div>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 text-sidebar-foreground/40"
                        onClick={() => {
                            setNewName(shopName);
                            setSettingsOpen(true);
                        }}
                    >
                        <Settings className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0 bg-background overflow-x-hidden">
                <Outlet />
            </main>

            {/* Mobile bottom nav (Quick Access) */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur-md text-sidebar-foreground border-t border-sidebar-border grid grid-cols-5 h-16">
              {[nav[0], nav[1], nav[2], nav[6], nav[7]].map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-1 transition-all ${isActive ? "text-sidebar-primary bg-sidebar-accent/30" : "text-sidebar-foreground/40"}`}>
                  <n.icon className="h-5 w-5" />
                  <span className="text-[9px] font-medium">{n.label}</span>
                </NavLink>
              ))}
            </nav>

            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent className="max-h-[90vh] flex flex-col p-6" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Account Settings</DialogTitle>
                        <DialogDescription>Update your profile details, view your login email, or change your password.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2 overflow-y-auto flex-1 px-1">
                        <div className="space-y-2">
                            <Label>Email Address (Login ID)</Label>
                            <Input value={user?.email || ""} readOnly className="bg-muted text-muted-foreground font-medium select-all" />
                        </div>
                        <div className="space-y-2">
                            <Label>User Name (Full Name)</Label>
                            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Shop Name</Label>
                            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Enter shop name..." />
                        </div>
                        <div className="space-y-2">
                            <Label>PAN Number</Label>
                            <Input value={panNo} onChange={(e) => setPanNo(e.target.value)} placeholder="Enter PAN number..." />
                        </div>

                        <div className="pt-2 border-t space-y-4">
                            <div className="font-medium text-sm text-muted-foreground">Verify Identity</div>
                            <div className="space-y-2">
                                <Label>Current Password</Label>
                                <div className="relative">
                                    <Input 
                                        type={showPassword ? "text" : "password"} 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        placeholder="Required to save changes"
                                        autoComplete="off"
                                        autoFocus={false}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t space-y-4">
                            <div className="font-medium text-sm text-muted-foreground">Change Password (Optional)</div>
                            <div className="space-y-2">
                                <Label>New Password</Label>
                                <div className="relative">
                                    <Input 
                                        type={showNewPassword ? "text" : "password"} 
                                        value={newPassword} 
                                        onChange={(e) => setNewPassword(e.target.value)} 
                                        placeholder="Leave blank to keep current"
                                        autoComplete="new-password"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={busy} className="bg-primary text-primary-foreground">
                            {busy ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
