-- Set is_manufactured to true for products that have ingredients
UPDATE public.products
SET is_manufactured = true
WHERE id IN (SELECT DISTINCT product_id FROM public.product_ingredients);
