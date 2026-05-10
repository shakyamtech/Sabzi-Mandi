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
import { Sprout, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

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

  const PasswordField = (
    <div>
      <Label>Password</Label>
      <div className="relative">
        <Input
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow mb-3">
            <Sprout className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl text-foreground">Sabzi</h1>
          <p className="text-muted-foreground text-sm mt-1">Vegetable shop POS & inventory — done simply</p>
        </div>

        <Card className="p-6 shadow-elegant">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                {PasswordField}
                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-soft">
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div><Label>Your name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ramesh Kumar" /></div>
                <div><Label>Shop name</Label><Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Sharma Vegetable Mart" /></div>
                <div><Label>PAN Number</Label><Input value={panNo} onChange={(e) => setPanNo(e.target.value)} placeholder="Enter PAN number" /></div>
                <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                {PasswordField}
                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-soft">
                  {loading ? "Creating..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
