import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt, fmtQty } from "@/lib/format";
import { Plus, Pencil, Trash2, AlertTriangle, ChefHat } from "lucide-react";
import { toast } from "sonner";

type Ingredient = {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
  ingredient_name?: string;
  unit?: string;
};

type Product = {
  id: string; name: string; unit: string;
  cost_price: number; sell_price: number; stock_qty: number; low_stock_threshold: number;
  is_manufactured: boolean;
};

const blank = { name: "", unit: "kg", cost_price: 0, sell_price: 0, stock_qty: 0, low_stock_threshold: 5, is_manufactured: false };

const Products = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(blank);
  const [search, setSearch] = useState("");
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([]);
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newIngredientQty, setNewIngredientQty] = useState("1");

  const load = async () => {
    const [{ data: p }, { data: i }] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("product_ingredients" as any).select("*, ingredient:products!fk_product_ingredient(name, unit)")
    ]);

    setItems((p ?? []) as any);

    const formatted = (i || []).map((ing: any) => ({
      ...ing,
      ingredient_name: ing.ingredient?.name,
      unit: ing.ingredient?.unit
    }));
    setRecipeIngredients(formatted);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const save = async () => {
    if (!edit.name.trim()) return toast.error("Name required");
    const payload = { ...edit, user_id: user!.id, name: edit.name.trim() };
    const { error } = edit.id
      ? await supabase.from("products").update(payload).eq("id", edit.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setOpen(false); setEdit(blank); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const loadRecipe = async (product: Product) => {
    setActiveProduct(product);
    const { data, error } = await supabase
      .from("product_ingredients" as any)
      .select("*, ingredient:products!fk_product_ingredient(name, unit)")
      .eq("product_id", product.id);

    if (error) {
      // If table doesn't exist yet, we'll handle it gracefully
      if (error.code === "PGRST116" || error.message.includes("does not exist")) {
        toast.error("Please run the SQL migration first!");
      } else {
        toast.error(error.message);
      }
      return;
    }

    const formatted = (data || []).map((i: any) => ({
      ...i,
      ingredient_name: i.ingredient?.name,
      unit: i.ingredient?.unit
    }));
    setRecipeIngredients(formatted);
    setRecipeOpen(true);
  };

  const addIngredient = async () => {
    if (!activeProduct || !newIngredientId) return;
    const { error } = await supabase.from("product_ingredients" as any).insert({
      product_id: activeProduct.id,
      ingredient_id: newIngredientId,
      quantity: Number(newIngredientQty),
      user_id: user?.id
    });
    if (error) return toast.error(error.message);
    setNewIngredientId("");
    setNewIngredientQty("1");
    loadRecipe(activeProduct);
  };

  const removeIngredient = async (id: string) => {
    const { error } = await supabase.from("product_ingredients" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (activeProduct) loadRecipe(activeProduct);
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Products & Stock"
        subtitle="Manage your vegetables and live stock"
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit(blank); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary text-primary-foreground shadow-soft"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{edit.id ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Enter vegetable or item name..." /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Unit</Label>
                    <Select value={edit.unit} onValueChange={(v) => setEdit({ ...edit, unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">gram</SelectItem>
                        <SelectItem value="Ltr">ltr</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="pcs">pcs</SelectItem>
                        <SelectItem value="pkt">packet</SelectItem>
                        <SelectItem value="cup">cup</SelectItem>
                        <SelectItem value="jar">jar</SelectItem>
                        <SelectItem value="dozen">dozen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Stock Qty</Label><Input type="number" step="0.001" value={edit.stock_qty} onChange={(e) => setEdit({ ...edit, stock_qty: +e.target.value })} onWheel={(e) => e.currentTarget.blur()} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cost Price (Rs.)</Label><Input type="number" step="0.01" value={edit.cost_price} onChange={(e) => setEdit({ ...edit, cost_price: +e.target.value })} onWheel={(e) => e.currentTarget.blur()} /></div>
                  <div><Label>Sell Price (Rs.)</Label><Input type="number" step="0.01" value={edit.sell_price} onChange={(e) => setEdit({ ...edit, sell_price: +e.target.value })} onWheel={(e) => e.currentTarget.blur()} /></div>
                </div>
                <div><Label>Low-stock alert at</Label><Input type="number" step="0.001" value={edit.low_stock_threshold} onChange={(e) => setEdit({ ...edit, low_stock_threshold: +e.target.value })} onWheel={(e) => e.currentTarget.blur()} /></div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_manufactured"
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={edit.is_manufactured}
                    onChange={(e) => setEdit({ ...edit, is_manufactured: e.target.checked })}
                  />
                  <Label htmlFor="is_manufactured" className="cursor-pointer font-medium text-primary">Made in our Shop (Has Recipe)</Label>
                </div>
                <Button onClick={save} className="w-full bg-gradient-primary text-primary-foreground mt-2">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Input className="mb-4 max-w-sm" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p) => {
          // Dynamic calculation of 'Produced Stock' based on ingredients
          let possibleStock = Infinity;
          const recipe = items.filter(other => items.find(pi => pi.id === p.id)) // This is a bit complex in-situ, let's simplify

          // Find ingredients for this product
          const ingredients = recipeIngredients.filter(ri => ri.product_id === p.id);

          if (ingredients.length > 0) {
            ingredients.forEach(ing => {
              const actualProduct = items.find(prod => prod.id === ing.ingredient_id);
              if (actualProduct) {
                const canMake = Math.floor(actualProduct.stock_qty / ing.quantity);
                if (canMake < possibleStock) possibleStock = canMake;
              }
            });
          } else {
            possibleStock = p.stock_qty;
          }

          const displayStock = Math.max(0, (possibleStock === Infinity ? 0 : possibleStock));
          const low = Number(displayStock) <= Number(p.low_stock_threshold);

          return (
            <Card key={p.id} className="p-4 shadow-card border-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-lg">{p.name}</div>
                  <div className="text-xs text-muted-foreground">per {p.unit}</div>
                </div>
                <div className="flex gap-1">
                  {p.is_manufactured && (
                    <Button size="icon" variant="ghost" onClick={() => loadRecipe(p)} title="Manage Recipe"><ChefHat className="h-4 w-4 text-orange-500" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => { setEdit(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                <div><div className="text-muted-foreground text-xs">Cost</div><div>{fmt(p.cost_price)}</div></div>
                <div><div className="text-muted-foreground text-xs">Sell</div><div className="text-primary font-medium">{fmt(p.sell_price)}</div></div>
              </div>
              <div className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 ${low ? "bg-warning/15 text-warning-foreground" : "bg-secondary"}`}>
                <span className="text-xs">{ingredients.length > 0 ? "Possible Stock" : "Stock"}</span>
                <span className="font-medium flex items-center gap-1">
                  {low && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                  {fmtQty(displayStock)} {p.unit}
                </span>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No products yet. Add your first vegetable!</div>}
      </div>

      <Dialog open={recipeOpen} onOpenChange={setRecipeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recipe for {activeProduct?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label>Add Ingredient</Label>
                <Select value={newIngredientId} onValueChange={setNewIngredientId}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {items.filter(p => p.id !== activeProduct?.id).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-24 space-y-2">
                <Label>Qty</Label>
                <Input type="number" value={newIngredientQty} onChange={e => setNewIngredientQty(e.target.value)} />
              </div>
              <Button onClick={addIngredient} size="icon"><Plus className="h-4 w-4" /></Button>
            </div>

            <div className="space-y-2">
              <Label>Required Ingredients</Label>
              {recipeIngredients.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4 border rounded-lg border-dashed">
                  No ingredients added yet
                </div>
              )}
              {recipeIngredients.map(ing => (
                <div key={ing.id} className="flex items-center justify-between bg-secondary p-2 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">{ing.ingredient_name}</span>
                    <span className="text-muted-foreground ml-2">{ing.quantity} {ing.unit}</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeIngredient(ing.id)} className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={() => setRecipeOpen(false)} variant="secondary" className="w-full">Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
