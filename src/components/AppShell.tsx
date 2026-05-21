import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  BookOpen, Wallet, BarChart3, FileSpreadsheet, LogOut, Sprout, Shield, Settings,
  Eye, EyeOff, Menu, RotateCcw, Trash2, User, Store, Palette, Sun, Moon, Laptop, Info
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  const { lang, setLang, t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { setTheme } = useTheme();
  const [shopName, setShopName] = useState("My Shop");
  const [newName, setNewName] = useState("");
  const [panNo, setPanNo] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const navTranslationKeys: Record<string, string> = {
    "Dashboard": t.dashboard,
    "POS Billing": t.posBilling,
    "Products": t.products,
    "Customers": t.customers,
    "Suppliers": t.suppliers,
    "Purchases": t.purchases,
    "Cashbook": t.cashbook,
    "Reports": t.reports,
    "Balance Sheet": t.balanceSheet,
    "Admin": t.admin,
  };

  const navItems = isAdmin ? [...nav, { to: "/admin", label: "Admin", icon: Shield }] : nav;

  useEffect(() => {
      if (!user) {
            setShopName("My Shop");
            return;
        }
        
        const loadProfile = async () => {
            const { data, error } = await supabase.from("profiles").select("shop_name, pan_no, full_name").eq("id", user.id).maybeSingle();
            
            if (data) {
                const sName = data.shop_name || user.user_metadata?.shop_name || "My Shop";
                setShopName(sName);
                setNewName(sName);
                localStorage.setItem("sabzi_shop_name", sName);
                setPanNo(data.pan_no || user.user_metadata?.pan_no || "");
                setFullName(data.full_name || user.user_metadata?.full_name || "");
            } else {
                const metaShop = user.user_metadata?.shop_name || "My Shop";
                const metaPan = user.user_metadata?.pan_no || "";
                const metaName = user.user_metadata?.full_name || "";
                setShopName(metaShop);
                setNewName(metaShop);
                localStorage.setItem("sabzi_shop_name", metaShop);
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

    const handleSaveProfile = async () => {
        if (!password) return toast.error("Please enter your current password to confirm");
        
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
                full_name: fullName
            }).eq("id", user?.id);
            
            if (profileError) throw profileError;

            const updatePayload: any = { data: { full_name: fullName } };
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

            toast.success("Profile details updated successfully!");
            setProfileOpen(false);
        } catch (err: any) {
            toast.error(err.message || "An error occurred");
        } finally {
            setBusy(false);
            setPassword("");
        }
    };

    const handleSaveShop = async () => {
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
                pan_no: panNo
            }).eq("id", user?.id);
            
            if (profileError) throw profileError;
            setShopName(newName);
            localStorage.setItem("sabzi_shop_name", newName);

            const updatePayload: any = { data: { shop_name: newName, pan_no: panNo } };
            const { error: authMetaErr } = await supabase.auth.updateUser(updatePayload);
            if (authMetaErr) throw authMetaErr;

            toast.success("Shop settings saved successfully!");
            setShopOpen(false);
        } catch (err: any) {
            toast.error(err.message || "An error occurred");
        } finally {
            setBusy(false);
            setPassword("");
        }
    };

    const handleSelfReset = async () => {
        if (!user?.id) return;
        setBusy(true);
        try {
            // Delete all transaction tables for this user
            const tablesToWipe = ["sale_items", "sales", "purchase_items", "purchases", "cash_transactions", "ledger_entries", "expenses"];
            for (const t of tablesToWipe) {
                const { error } = await supabase.from(t).delete().eq("user_id", user.id);
                if (error) throw error;
            }
            
            // Reset customer and supplier balances to 0
            const { error: custErr } = await supabase.from("customers").update({ balance: 0 }).eq("user_id", user.id);
            if (custErr) throw custErr;
            
            const { error: suppErr } = await supabase.from("suppliers").update({ balance: 0 }).eq("user_id", user.id);
            if (suppErr) throw suppErr;

            toast.success(lang === "NEP" ? "कारोबार र लेजर सफलतापूर्वक रिसेट गरियो!" : "All transactions and ledgers reset successfully!");
            setSettingsOpen(false);
            
            // Reload window to refresh current page state
            window.location.reload();
        } catch (err: any) {
            toast.error(err.message || "Failed to reset data");
        } finally {
            setBusy(false);
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
                            <div className="text-xs text-sidebar-foreground/60 truncate">{shopName}</div>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((n) => {
                        const translatedLabel = navTranslationKeys[n.label] || n.label;
                        return (
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
                                <n.icon className="h-4 w-4" /> {translatedLabel}
                            </NavLink>
                        );
                    })}
                </nav>
                
                {/* Desktop Language Switcher Footer Option */}
                <div className="px-6 py-3 border-t border-sidebar-border/60">
                    <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
                        <span>{t.language}</span>
                        <div className="flex items-center gap-1 bg-sidebar-accent/50 p-0.5 rounded-lg border border-sidebar-border/40">
                            <button 
                                onClick={() => setLang("ENG")} 
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all duration-200 ${lang === "ENG" ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"}`}
                            >
                                ENG
                            </button>
                            <button 
                                onClick={() => setLang("NEP")} 
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all duration-200 ${lang === "NEP" ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"}`}
                            >
                                नेपाली
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-3 border-t border-sidebar-border mt-auto">
                    <div className="px-3 py-1 text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest">{t.version} 1.2.1</div>
                </div>
            </aside>

            {/* Desktop top-right profile corner */}
            <div className="hidden md:flex fixed top-4 right-6 z-50 items-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full ring-2 ring-primary/20 hover:ring-primary/45 focus:ring-primary/50 transition-all select-none p-0 flex items-center justify-center bg-card shadow-sm hover:scale-105 active:scale-95 duration-200">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm uppercase">
                                    {fullName ? fullName.slice(0, 2) : (user?.email ? user.email.slice(0, 2) : "US")}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-bold leading-none text-foreground">{fullName || "User Profile"}</p>
                                <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                            setNewName(shopName);
                            setProfileOpen(true);
                        }} className="cursor-pointer font-medium gap-2">
                            <User className="h-4 w-4 text-primary" /> {lang === "NEP" ? "प्रोफाइल सेटिङ" : "Profile Settings"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                            setNewName(shopName);
                            setShopOpen(true);
                        }} className="cursor-pointer font-medium gap-2">
                            <Store className="h-4 w-4 text-primary" /> {lang === "NEP" ? "पसल सेटिङ" : "Shop Settings"}
                        </DropdownMenuItem>
                        
                        {/* Theme options Submenu */}
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="font-medium gap-2">
                                <Palette className="h-4 w-4 text-primary" /> {lang === "NEP" ? "रंग / थिम" : "Theme Options"}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer gap-2">
                                        <Sun className="h-4 w-4 text-amber-500" /> {lang === "NEP" ? "उज्यालो (Light)" : "Light Mode"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer gap-2">
                                        <Moon className="h-4 w-4 text-indigo-500" /> {lang === "NEP" ? "अध्यारो (Dark)" : "Dark Mode"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer gap-2">
                                        <Laptop className="h-4 w-4 text-muted-foreground" /> {lang === "NEP" ? "सिस्टम (System)" : "System Default"}
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        
                        <DropdownMenuItem onClick={() => setAboutOpen(true)} className="cursor-pointer font-medium gap-2">
                            <Info className="h-4 w-4 text-primary" /> {lang === "NEP" ? "हाम्रो बारेमा" : "About App"}
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }} className="cursor-pointer font-bold text-destructive hover:bg-destructive/10 hover:text-destructive gap-2">
                            <LogOut className="h-4 w-4" /> {t.signOut}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

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
                                {navItems.map((n) => {
                                    const translatedLabel = navTranslationKeys[n.label] || n.label;
                                    return (
                                        <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMobileMenuOpen(false)}
                                            className={({ isActive }) =>
                                                `flex items-center gap-4 px-4 py-4 rounded-xl text-sm font-medium transition-all ${
                                                    isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                                                }`
                                            }
                                        >
                                            <n.icon className="h-5 w-5" /> {translatedLabel}
                                        </NavLink>
                                    );
                                })}
                            </nav>

                            {/* Mobile Language Switcher Row */}
                            <div className="px-6 py-4 border-t border-sidebar-border/60">
                                <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
                                    <span>{t.language}</span>
                                    <div className="flex items-center gap-1 bg-sidebar-accent/50 p-0.5 rounded-lg border border-sidebar-border/40">
                                        <button 
                                            onClick={() => setLang("ENG")} 
                                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all duration-200 ${lang === "ENG" ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"}`}
                                        >
                                            ENG
                                        </button>
                                        <button 
                                            onClick={() => setLang("NEP")} 
                                            className={`px-3 py-1 rounded text-[10px] font-bold transition-all duration-200 ${lang === "NEP" ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"}`}
                                        >
                                            नेपाली
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-sidebar-border mt-auto">
                                <div className="px-1 mb-4 text-[10px] font-bold text-sidebar-foreground/30 uppercase tracking-widest">{t.version} 1.2.1</div>
                                <Button className="w-full justify-start gap-3 h-12 rounded-xl shadow-lg bg-[#FACC15] hover:bg-[#EAB308] text-black border-none font-bold"
                                    onClick={async () => { await signOut(); navigate("/auth"); }}>
                                    <LogOut className="h-5 w-5" /> {t.signOut}
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <div className="text-sm font-bold bg-sidebar-accent px-3 py-1.5 rounded-lg text-sidebar-foreground truncate max-w-[220px] uppercase tracking-tight">{shopName}</div>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 focus:ring-primary/50 transition-all select-none p-0 flex items-center justify-center">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm uppercase">
                                        {fullName ? fullName.slice(0, 2) : (user?.email ? user.email.slice(0, 2) : "US")}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-bold leading-none text-foreground">{fullName || "User Profile"}</p>
                                    <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                                setNewName(shopName);
                                setProfileOpen(true);
                            }} className="cursor-pointer font-medium gap-2">
                                <User className="h-4 w-4 text-primary" /> {lang === "NEP" ? "प्रोफाइल सेटिङ" : "Profile Settings"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                setNewName(shopName);
                                setShopOpen(true);
                            }} className="cursor-pointer font-medium gap-2">
                                <Store className="h-4 w-4 text-primary" /> {lang === "NEP" ? "पसल सेटिङ" : "Shop Settings"}
                            </DropdownMenuItem>
                            
                            {/* Theme options Submenu */}
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="font-medium gap-2">
                                    <Palette className="h-4 w-4 text-primary" /> {lang === "NEP" ? "रंग / थिम" : "Theme Options"}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer gap-2">
                                            <Sun className="h-4 w-4 text-amber-500" /> {lang === "NEP" ? "उज्यालो (Light)" : "Light Mode"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer gap-2">
                                            <Moon className="h-4 w-4 text-indigo-500" /> {lang === "NEP" ? "अध्यारो (Dark)" : "Dark Mode"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer gap-2">
                                            <Laptop className="h-4 w-4 text-muted-foreground" /> {lang === "NEP" ? "सिस्टम (System)" : "System Default"}
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            
                            <DropdownMenuItem onClick={() => setAboutOpen(true)} className="cursor-pointer font-medium gap-2">
                                <Info className="h-4 w-4 text-primary" /> {lang === "NEP" ? "हाम्रो बारेमा" : "About App"}
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }} className="cursor-pointer font-bold text-destructive hover:bg-destructive/10 hover:text-destructive gap-2">
                                <LogOut className="h-4 w-4" /> {t.signOut}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0 bg-background overflow-x-hidden">
                <Outlet />
            </main>

            {/* Mobile bottom nav (Quick Access) */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur-md text-sidebar-foreground border-t border-sidebar-border grid grid-cols-5 h-16">
              {[nav[0], nav[1], nav[2], nav[6], nav[7]].map((n) => {
                const translatedLabel = navTranslationKeys[n.label] || n.label;
                return (
                    <NavLink key={n.to} to={n.to} end={n.end}
                      className={({ isActive }) =>
                        `flex flex-col items-center justify-center gap-1 transition-all ${isActive ? "text-sidebar-primary bg-sidebar-accent/30" : "text-sidebar-foreground/40"}`}
                    >
                      <n.icon className="h-5 w-5" />
                      <span className="text-[9px] font-medium">{translatedLabel}</span>
                    </NavLink>
                );
              })}
            </nav>

            {/* Profile Settings Modal */}
            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
                <DialogContent className="max-h-[90vh] flex flex-col p-6" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader className="shrink-0">
                        <DialogTitle>{lang === "NEP" ? "प्रोफाइल सेटिङ" : "Profile Settings"}</DialogTitle>
                        <DialogDescription>{t.confirmPasswordToSave}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2 overflow-y-auto flex-1 px-1">
                        <div className="space-y-2">
                            <Label>Email Address (Login ID)</Label>
                            <Input value={user?.email || ""} readOnly className="bg-muted text-muted-foreground font-medium select-all" />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.yourName}</Label>
                            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name..." />
                        </div>

                        <div className="pt-2 border-t space-y-2">
                            <Label>{t.currentPassword}</Label>
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

                        <div className="pt-2 border-t space-y-2">
                            <Label>{t.newPassword} <span className="text-muted-foreground/60 font-normal">{t.panOptional}</span></Label>
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProfileOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleSaveProfile} disabled={busy} className="bg-primary text-primary-foreground">
                            {busy ? t.saving : t.saveChanges}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Shop Settings Modal */}
            <Dialog open={shopOpen} onOpenChange={setShopOpen}>
                <DialogContent className="max-h-[90vh] flex flex-col p-6" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader className="shrink-0">
                        <DialogTitle>{lang === "NEP" ? "पसल सेटिङ" : "Shop Settings"}</DialogTitle>
                        <DialogDescription>{t.confirmPasswordToSave}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2 overflow-y-auto flex-1 px-1">
                        <div className="space-y-2">
                            <Label>{t.shopName}</Label>
                            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Enter shop name..." />
                        </div>
                        <div className="space-y-2">
                            <Label>{t.panNo}</Label>
                            <Input value={panNo} onChange={(e) => setPanNo(e.target.value)} placeholder="Enter PAN number..." />
                        </div>

                        <div className="pt-2 border-t space-y-2">
                            <Label>{t.currentPassword}</Label>
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

                        <div className="pt-4 border-t border-destructive/20 mt-6 space-y-3 bg-destructive/5 -mx-6 px-6 py-4">
                            <div className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                                <Trash2 className="h-4 w-4" />
                                {lang === "NEP" ? "खतरा क्षेत्र (Danger Zone)" : "Danger Zone"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {lang === "NEP" 
                                    ? "आफ्नो पसलको सबै नाफा-नोक्सान, क्यासबुक, उधारो लेजर र खरिद/बिक्री डाटा रिसेट गर्नुहोस्। सामानको सूची (Products) सुरक्षित रहनेछ।"
                                    : "Reset all your profit/loss, cashbook, credit ledgers, and sales/purchase data. Your product catalog will be preserved intact."}
                            </p>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        type="button"
                                        variant="outline" 
                                        size="sm"
                                        className="border-destructive/30 text-destructive hover:bg-destructive hover:text-white transition-all h-9 w-full"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                        {lang === "NEP" ? "सबै कारोबार र लेजर रिसेट गर्नुहोस्" : "Reset All Ledgers & Sales"}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            {lang === "NEP" ? "के तपाईं आफ्नो सबै डाटा रिसेट गर्न चाहनुहुन्छ?" : "Reset all your store transactions?"}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {lang === "NEP"
                                                ? "यसले तपाइँको पसलको सम्पूर्ण बिक्री, खरिद, क्यासबुक र लेजर इतिहास स्थायी रूपमा मेटाउनेछ। सामानहरू (Products) सुरक्षित रहनेछन्, र ग्राहक/सप्लायरको मौज्दात (Balance) ० हुनेछ। यो फिर्ता गर्न सकिने छैन।"
                                                : "This will permanently delete all your sales, purchases, cash transactions, ledger entries, and expenses. Your products will be preserved, and customer/supplier balances will be reset to 0. This action cannot be undone."}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                        <AlertDialogAction 
                                            onClick={handleSelfReset} 
                                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                        >
                                            {lang === "NEP" ? "डाटा रिसेट गर्नुहोस्" : "Reset Data"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShopOpen(false)}>{t.cancel}</Button>
                        <Button onClick={handleSaveShop} disabled={busy} className="bg-primary text-primary-foreground">
                            {busy ? t.saving : t.saveChanges}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* About Modal */}
            <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
                <DialogContent className="max-w-md p-6 flex flex-col items-center text-center">
                    <DialogHeader className="w-full shrink-0 flex flex-col items-center">
                        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 shadow-soft animate-pulse">
                            <Sprout className="h-9 w-9 text-primary" />
                        </div>
                        <DialogTitle className="text-xl font-display font-extrabold bg-gradient-primary bg-clip-text text-transparent">
                            Sabzi - Mandi POS
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                            {lang === "NEP" ? "संस्करण १.२.१" : "Version 1.2.1"}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4 w-full">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {lang === "NEP" 
                                ? "सबै सब्जी तथा फलफूल पसलहरूका लागि आधुनिक, छिटो र सरल बिलिङ र लेजर व्यवस्थापन प्रणाली।"
                                : "A premium, super-fast point-of-sale (POS) and ledger bookkeeping solution tailored perfectly for agricultural merchants."}
                        </p>
                        
                        <div className="p-4 rounded-xl bg-secondary/60 border border-border/40 backdrop-blur-sm space-y-1">
                            <div className="text-xs text-muted-foreground font-medium">
                                {lang === "NEP" ? "द्वारा विकसित:" : "Developed By:"}
                            </div>
                            <a href="https://shakya-portal.pages.dev/" target="_blank" rel="noopener noreferrer" className="text-base font-extrabold text-foreground tracking-tight hover:text-primary hover:underline transition-colors block">
                                Mahesh Shakya
                            </a>
                            <div className="text-xs text-primary font-medium">
                                shakya.mahes@gmail.com
                            </div>
                        </div>
                        
                        <p className="text-[10px] text-muted-foreground/60 italic">
                            © {new Date().getFullYear()} Sabzi Mandi POS · All Rights Reserved
                        </p>
                    </div>
                    
                    <DialogFooter className="w-full sm:justify-center">
                        <Button 
                            onClick={() => setAboutOpen(false)} 
                            className="bg-primary text-primary-foreground font-semibold px-8"
                        >
                            {lang === "NEP" ? "बन्द गर्नुहोस्" : "Close"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
