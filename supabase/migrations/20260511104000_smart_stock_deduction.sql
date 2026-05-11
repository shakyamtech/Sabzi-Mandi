-- Update checkout_sale to prioritize finished stock and fallback to ingredients
CREATE OR REPLACE FUNCTION public.checkout_sale(
  p_customer_id UUID,
  p_payment_mode TEXT,
  p_amount_paid NUMERIC,
  p_note TEXT,
  p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_sale_id UUID;
  v_total NUMERIC := 0;
  v_cost_total NUMERIC := 0;
  v_item JSONB;
  v_credit NUMERIC;
  v_stock NUMERIC;
  v_ing RECORD;
  v_needed NUMERIC;
  v_from_stock NUMERIC;
  v_from_ing NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- 1. CREATE SALE RECORD
  INSERT INTO public.sales (user_id, customer_id, payment_mode, amount_paid, note)
  VALUES (v_uid, p_customer_id, p_payment_mode, p_amount_paid, p_note)
  RETURNING id INTO v_sale_id;

  -- 2. PROCESS ITEMS & DEDUCT STOCK
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_needed := (v_item->>'qty')::numeric;
    
    INSERT INTO public.sale_items (sale_id, user_id, product_id, product_name, qty, unit, sell_price, cost_price, line_total)
    VALUES (
      v_sale_id, v_uid,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      v_needed,
      COALESCE(v_item->>'unit','kg'),
      (v_item->>'sell_price')::numeric,
      COALESCE((v_item->>'cost_price')::numeric, 0),
      (v_item->>'sell_price')::numeric * v_needed
    );

    -- DEDUCT STOCK Logic:
    -- A. Check what's available on shelf (Ready Stock)
    SELECT stock_qty INTO v_stock FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    
    v_from_stock := LEAST(v_stock, v_needed);
    v_from_ing := v_needed - v_from_stock;

    -- Deduct from shelf
    IF v_from_stock > 0 THEN
      UPDATE public.products 
      SET stock_qty = stock_qty - v_from_stock, 
          updated_at = now() 
      WHERE id = (v_item->>'product_id')::uuid;
    END IF;

    -- B. Deduct remainder from Ingredients (if any and if recipe exists)
    IF v_from_ing > 0 THEN
      IF EXISTS (SELECT 1 FROM public.product_ingredients WHERE product_id = (v_item->>'product_id')::uuid) THEN
        FOR v_ing IN SELECT * FROM public.product_ingredients WHERE product_id = (v_item->>'product_id')::uuid LOOP
          -- Deduct raw material
          UPDATE public.products 
          SET stock_qty = stock_qty - (v_ing.quantity * v_from_ing),
              updated_at = now()
          WHERE id = v_ing.ingredient_id;
          
          -- Final sanity check on raw material
          IF (SELECT stock_qty FROM public.products WHERE id = v_ing.ingredient_id) < 0 THEN
            RAISE EXCEPTION 'Insufficient raw material for %: %', v_item->>'product_name', (SELECT name FROM public.products WHERE id = v_ing.ingredient_id);
          END IF;
        END LOOP;
      ELSIF v_stock < v_needed THEN
         -- No recipe and not enough stock
         RAISE EXCEPTION 'Insufficient stock for %', v_item->>'product_name';
      END IF;
    END IF;

    v_total := v_total + (v_item->>'sell_price')::numeric * v_needed;
    v_cost_total := v_cost_total + COALESCE((v_item->>'cost_price')::numeric,0) * v_needed;
  END LOOP;

  UPDATE public.sales SET total = v_total, cost_total = v_cost_total WHERE id = v_sale_id;

  -- 3. FINANCE (Cashbook & Ledger)
  IF p_amount_paid > 0 THEN
    INSERT INTO public.cash_transactions (user_id, direction, amount, category, note, reference_id)
    VALUES (v_uid, 'in', p_amount_paid, 'sale', 'Sale payment', v_sale_id);
  END IF;

  v_credit := v_total - p_amount_paid;
  IF p_customer_id IS NOT NULL AND v_credit <> 0 THEN
    INSERT INTO public.ledger_entries (user_id, party_type, party_id, entry_type, amount, reference_id, note)
    VALUES (v_uid, 'customer', p_customer_id, 'sale', v_credit, v_sale_id, 'Sale on credit');
  END IF;

  RETURN v_sale_id;
END;
$$;
