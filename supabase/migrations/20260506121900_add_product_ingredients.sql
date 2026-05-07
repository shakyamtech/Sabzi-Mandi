-- Create product_ingredients table
CREATE TABLE IF NOT EXISTS public.product_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own product ingredients" 
ON public.product_ingredients 
FOR ALL 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product_id ON public.product_ingredients(product_id);
