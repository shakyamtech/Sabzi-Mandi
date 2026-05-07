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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- 1. PRE-CHECK STOCK for all items (Safety Check)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- Check if it has ingredients (Recipe Product)
    IF EXISTS (SELECT 1 FROM public.product_ingredients WHERE product_id = (v_item->>'product_id')::uuid) THEN
      FOR v_ing IN SELECT * FROM public.product_ingredients WHERE product_id = (v_item->>'product_id')::uuid LOOP
        SELECT stock_qty INTO v_stock FROM public.products WHERE id = v_ing.ingredient_id;
        IF v_stock < (v_ing.quantity * (v_item->>'qty')::numeric) THEN
          RAISE EXCEPTION 'Insufficient ingredients for % (Need more %)', v_item->>'product_name', (SELECT name FROM public.products WHERE id = v_ing.ingredient_id);
        END IF;
      END LOOP;
    ELSE
      -- Simple product check
      SELECT stock_qty INTO v_stock FROM public.products WHERE id = (v_item->>'product_id')::uuid;
      IF v_stock < (v_item->>'qty')::numeric THEN
        RAISE EXCEPTION 'Insufficient stock for % (Available: %, Requested: %)', v_item->>'product_name', v_stock, (v_item->>'qty')::numeric;
      END IF;
    END IF;
  END LOOP;

  -- 2. CREATE SALE RECORD
  INSERT INTO public.sales (user_id, customer_id, payment_mode, amount_paid, note)
  VALUES (v_uid, p_customer_id, p_payment_mode, p_amount_paid, p_note)
  RETURNING id INTO v_sale_id;

  -- 3. PROCESS ITEMS & DEDUCT STOCK
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.sale_items (sale_id, user_id, product_id, product_name, qty, unit, sell_price, cost_price, line_total)
    VALUES (
      v_sale_id, v_uid,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'qty')::numeric,
      COALESCE(v_item->>'unit','kg'),
      (v_item->>'sell_price')::numeric,
      COALESCE((v_item->>'cost_price')::numeric, 0),
      (v_item->>'sell_price')::numeric * (v_item->>'qty')::numeric
    );

    -- DEDUCT STOCK (Deduct from Ingredients if recipe, otherwise from product)
    IF EXISTS (SELECT 1 FROM public.product_ingredients WHERE product_id = (v_item->>'product_id')::uuid) THEN
      FOR v_ing IN SELECT * FROM public.product_ingredients WHERE product_id = (v_item->>'product_id')::uuid LOOP
        UPDATE public.products 
        SET stock_qty = stock_qty - (v_ing.quantity * (v_item->>'qty')::numeric),
            updated_at = now()
        WHERE id = v_ing.ingredient_id;
      END LOOP;
    ELSE
      UPDATE public.products
      SET stock_qty = stock_qty - (v_item->>'qty')::numeric,
          updated_at = now()
      WHERE id = (v_item->>'product_id')::uuid;
    END IF;

    v_total := v_total + (v_item->>'sell_price')::numeric * (v_item->>'qty')::numeric;
    v_cost_total := v_cost_total + COALESCE((v_item->>'cost_price')::numeric,0) * (v_item->>'qty')::numeric;
  END LOOP;

  UPDATE public.sales SET total = v_total, cost_total = v_cost_total WHERE id = v_sale_id;

  -- 4. FINANCE (Cashbook & Ledger)
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
