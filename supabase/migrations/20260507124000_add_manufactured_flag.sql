-- Add is_manufactured column to products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_manufactured BOOLEAN DEFAULT false;
