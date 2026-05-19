import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sprout, Eye, EyeOff, Leaf, ShoppingBag, BarChart3, Users, Sparkles, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const emailSchema = z.string().trim().email("Invalid email").max(255);
const pwSchema = z.string().min(6, "Min 6 characters").max(100);

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [panNo, setPanNo] = useState("");
  const [showPw, setShowPw] = useState(false);
  const { lang, setLang, t } = useLanguage();

  const changeLang = (l: "ENG" | "NEP") => {
    setLang(l);
  };

  const PasswordField = (
    <div>
      <Label className="text-foreground/90 font-medium mb-1.5 block">{t.password}</Label>
      <div className="relative">
        <Input
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="pr-10 bg-white/70 border-border/60 focus:bg-white transition-all duration-300"
          autoComplete="current-password"
          placeholder={t.pwPlaceholder}
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
          aria-label={showPw ? "Hide password" : "Show password"}
        >
          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  useEffect(() => { if (user) navigate("/", { replace: true }); }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email); pwSchema.parse(password);
    } catch (err: any) { toast.error(err.errors?.[0]?.message ?? "Invalid input"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate("/");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(email); pwSchema.parse(password);
    } catch (err: any) { toast.error(err.errors?.[0]?.message ?? "Invalid input"); return; }
    setLoading(true);
    const { data: authData, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { 
          full_name: fullName, 
          shop_name: shopName || "My Vegetable Shop",
          pan_no: panNo
        },
      },
    });
    
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    // Manually ensure the profile is created with the correct data
    if (authData.user) {
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        full_name: fullName,
        shop_name: shopName || "My Vegetable Shop",
        pan_no: panNo
      });
    }

    setLoading(false);
    toast.success("Account created! Welcome to Sabzi.");
    navigate("/");
  };

  const handleForgotPassword = async () => {
    if (!email) return toast.error("Please enter your email address first.");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(true); // Keep it loading while they redirect
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent! Please check your email.");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-hero p-4 relative overflow-hidden font-sans">
      
      {/* Floating English / Nepali Language Switcher */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-1 bg-white/80 backdrop-blur-md border border-white/50 p-1 rounded-xl shadow-soft">
        <button 
          onClick={() => changeLang("ENG")} 
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-300 ${lang === "ENG" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
        >
          ENG
        </button>
        <button 
          onClick={() => changeLang("NEP")} 
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all duration-300 ${lang === "NEP" ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
        >
          नेपाली
        </button>
      </div>

      {/* Custom Styles for beautiful organic animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(6deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(15px) rotate(-8deg); }
        }
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(80px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(80px) rotate(-360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        .animate-float-1 { animation: float-slow 7s ease-in-out infinite; }
        .animate-float-2 { animation: float-medium 9s ease-in-out infinite; }
        .animate-float-3 { animation: float-slow 6s ease-in-out infinite 1s; }
        .animate-pulse-glow { animation: pulse-glow 10s ease-in-out infinite; }
        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
      `}</style>

      {/* Decorative Glow Orbs in the background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-300/30 blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-lime-200/40 blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full bg-orange-200/25 blur-[100px] pointer-events-none animate-pulse-glow" />

      {/* Floating Organic Leaf SVGs */}
      <div className="absolute top-[12%] left-[8%] animate-float-1 pointer-events-none opacity-40 md:opacity-100">
        <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-soft">
          <Leaf className="h-7 w-7 text-emerald-600 fill-emerald-500/20" />
        </div>
      </div>
      <div className="absolute bottom-[15%] left-[6%] animate-float-2 pointer-events-none opacity-40 md:opacity-100">
        <div className="p-4 bg-lime-500/10 rounded-full border border-lime-500/20 shadow-soft">
          <Sprout className="h-8 w-8 text-lime-600" />
        </div>
      </div>
      <div className="absolute top-[18%] right-[8%] animate-float-3 pointer-events-none opacity-40 md:opacity-100">
        <div className="p-3.5 bg-orange-500/10 rounded-full border border-orange-500/20 shadow-soft">
          <Sparkles className="h-6 w-6 text-orange-500" />
        </div>
      </div>
      <div className="absolute bottom-[20%] right-[6%] animate-float-1 pointer-events-none opacity-40 md:opacity-100">
        <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 shadow-soft">
          <Leaf className="h-6 w-6 text-emerald-500 rotate-45" />
        </div>
      </div>

      {/* Unified Vertical Layout (Branding on Top, Card in Center, Features at Bottom) */}
      <div className="w-full max-w-4xl flex flex-col items-center gap-8 relative z-10 text-center animate-fade-in px-4">
        
        {/* Brand Header - only visible on large screens */}
        <div className="hidden lg:flex flex-col items-center space-y-4 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow transition-all duration-500 hover:scale-105">
              <Sprout className="h-8 w-8 text-primary-foreground animate-pulse" />
            </div>
            <span className="font-display text-4xl md:text-5xl font-bold tracking-tight text-primary">Sabzi</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl md:text-4xl font-bold leading-tight text-foreground">
              {t.brandTitle}
            </h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl leading-relaxed mx-auto">
              {t.brandDesc}
            </p>
          </div>
        </div>

        {/* Centered Sign In / Sign Up Card */}
        <div className="w-full max-w-md animate-fade-in-up">
          <Card className="p-6 md:p-8 shadow-elegant border-white/40 glass-panel rounded-3xl transition-all duration-500 hover:shadow-glow/20">
            
            {/* Header for Mobile only */}
            <div className="text-center mb-6 lg:hidden">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-glow mb-2">
                <Sprout className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground">Sabzi</h1>
              <p className="text-muted-foreground text-xs mt-1">{t.subtitle}</p>
            </div>

            <div className="mb-6 text-left hidden lg:block">
              <h3 className="font-display text-xl font-bold text-foreground mb-1">{t.welcome}</h3>
              <p className="text-muted-foreground text-xs">{t.access}</p>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-6 bg-emerald-100/50 p-1 rounded-xl">
                <TabsTrigger 
                  value="signin" 
                  className="rounded-lg py-2 font-medium text-sm transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-soft"
                >
                  {t.signin}
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="rounded-lg py-2 font-medium text-sm transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-soft"
                >
                  {t.createAccount}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="focus-visible:outline-none focus-visible:ring-0">
                <form onSubmit={handleSignIn} className="space-y-4 text-left">
                  <div>
                    <Label className="text-foreground/90 font-medium mb-1.5 block">{t.email}</Label>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      className="bg-white/70 border-border/60 focus:bg-white transition-all duration-300"
                      placeholder={t.emailPlaceholder}
                    />
                  </div>
                  <div>
                    {PasswordField}
                    <div className="flex justify-end mt-1.5">
                      <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:text-emerald-700 hover:underline font-semibold transition-colors">
                        {t.forgotPw}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-soft h-11 font-medium rounded-xl text-sm transition-transform active:scale-95 duration-200 mt-2">
                    {loading ? t.processing : t.signInBtn}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="focus-visible:outline-none focus-visible:ring-0">
                <form onSubmit={handleSignUp} className="space-y-4 max-h-[380px] overflow-y-auto px-1.5 py-1 text-left">
                  <div>
                    <Label className="text-foreground/90 font-medium mb-1.5 block">{t.yourName}</Label>
                    <Input 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      placeholder={t.namePlaceholder} 
                      autoComplete="off"
                      className="bg-white/70 border-border/60 focus:bg-white transition-all duration-300"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground/90 font-medium mb-1.5 block">{t.shopName}</Label>
                    <Input 
                      value={shopName} 
                      onChange={(e) => setShopName(e.target.value)} 
                      placeholder={t.shopPlaceholder} 
                      autoComplete="off"
                      className="bg-white/70 border-border/60 focus:bg-white transition-all duration-300"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground/90 font-medium mb-1.5 block">{t.panNo} <span className="text-[10px] text-muted-foreground font-normal">{t.panOptional}</span></Label>
                    <Input 
                      value={panNo} 
                      onChange={(e) => setPanNo(e.target.value)} 
                      placeholder={t.panPlaceholder} 
                      autoComplete="off"
                      className="bg-white/70 border-border/60 focus:bg-white transition-all duration-300"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground/90 font-medium mb-1.5 block">{t.email}</Label>
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      autoComplete="off"
                      placeholder={t.emailPlaceholder}
                      className="bg-white/70 border-border/60 focus:bg-white transition-all duration-300"
                    />
                  </div>
                  <div>
                    <Label className="text-foreground/90 font-medium mb-1.5 block">{t.password}</Label>
                    <div className="relative">
                      <Input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="pr-10 bg-white/70 border-border/60 focus:bg-white transition-all duration-300"
                        autoComplete="new-password"
                        placeholder={t.pwPlaceholder}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-soft h-11 font-medium rounded-xl text-sm transition-transform active:scale-95 duration-200 mt-2">
                    {loading ? t.creating : t.createBtn}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Feature Cards Showcase */}
        <div className="hidden lg:block w-full max-w-4xl pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-2xl glass-panel shadow-soft hover:shadow-card transition-all duration-300 group hover:-translate-y-1">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:bg-primary transition-all duration-300">
                <ShoppingBag className="h-5 w-5 text-emerald-600 group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1">{t.posTitle}</h3>
              <p className="text-xs text-muted-foreground">{t.posDesc}</p>
            </div>
            <div className="p-4 rounded-2xl glass-panel shadow-soft hover:shadow-card transition-all duration-300 group hover:-translate-y-1">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center mb-3 group-hover:bg-accent transition-all duration-300">
                <BarChart3 className="h-5 w-5 text-orange-600 group-hover:text-accent-foreground" />
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1">{t.profitTitle}</h3>
              <p className="text-xs text-muted-foreground">{t.profitDesc}</p>
            </div>
            <div className="p-4 rounded-2xl glass-panel shadow-soft hover:shadow-card transition-all duration-300 group hover:-translate-y-1">
              <div className="h-10 w-10 rounded-lg bg-lime-500/10 flex items-center justify-center mb-3 group-hover:bg-lime-600 transition-all duration-300">
                <Users className="h-5 w-5 text-lime-700 group-hover:text-white" />
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1">{t.ledgerTitle}</h3>
              <p className="text-xs text-muted-foreground">{t.ledgerDesc}</p>
            </div>
            <div className="p-4 rounded-2xl glass-panel shadow-soft hover:shadow-card transition-all duration-300 group hover:-translate-y-1">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:bg-primary transition-all duration-300">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-bold text-sm text-foreground mb-1">{t.recipeTitle}</h3>
              <p className="text-xs text-muted-foreground">{t.recipeDesc}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;
