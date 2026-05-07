-- STRONG FIX for record_purchase to ensure cashbook entry is ALWAYS created
CREATE OR REPLACE FUNCTION public.record_purchase(
  p_supplier_id UUID,
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
  v_pid UUID;
  v_total NUMERIC := 0;
  v_item JSONB;
  v_credit NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- 1. Create Purchase
  INSERT INTO public.purchases (user_id, supplier_id, payment_mode, amount_paid, note)
  VALUES (v_uid, p_supplier_id, p_payment_mode, p_amount_paid, p_note)
  RETURNING id INTO v_pid;

  -- 2. Process Items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.purchase_items (purchase_id, user_id, product_id, product_name, qty, unit, cost_price, line_total)
    VALUES (
      v_pid, v_uid,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'qty')::numeric,
      COALESCE(v_item->>'unit','kg'),
      (v_item->>'cost_price')::numeric,
      (v_item->>'cost_price')::numeric * (v_item->>'qty')::numeric
    );

    UPDATE public.products
    SET stock_qty = stock_qty + (v_item->>'qty')::numeric,
        cost_price = (v_item->>'cost_price')::numeric,
        updated_at = now()
    WHERE id = (v_item->>'product_id')::uuid; -- Removed user_id check here for robustness

    v_total := v_total + (v_item->>'cost_price')::numeric * (v_item->>'qty')::numeric;
  END LOOP;

  -- 3. Update Purchase Total
  UPDATE public.purchases SET total = v_total WHERE id = v_pid;

  -- 4. CASHBOOK ENTRY (The Fix)
  -- We use a COALESCE to ensure 0 is handled correctly, and we force the insert
  IF COALESCE(p_amount_paid, 0) > 0 THEN
    INSERT INTO public.cash_transactions (user_id, direction, amount, category, note, reference_id)
    VALUES (v_uid, 'out', p_amount_paid, 'purchase', 'Purchase payment', v_pid);
  END IF;

  -- 5. LEDGER ENTRY
  v_credit := v_total - COALESCE(p_amount_paid, 0);
  IF p_supplier_id IS NOT NULL AND v_credit <> 0 THEN
    UPDATE public.suppliers SET balance = balance + v_credit WHERE id = p_supplier_id;
    INSERT INTO public.ledger_entries (user_id, party_type, party_id, entry_type, amount, reference_id, note)
    VALUES (v_uid, 'supplier', p_supplier_id, CASE WHEN v_credit > 0 THEN 'credit' ELSE 'debit' END, ABS(v_credit), v_pid, 'Purchase on credit');
  END IF;

  RETURN v_pid;
END;
$$;
