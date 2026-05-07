-- UPDATE RPCs to include party_id and party_name in cash_transactions

-- 1. checkout_sale
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
  v_party_name TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- Get customer name
  IF p_customer_id IS NOT NULL THEN
    SELECT name INTO v_party_name FROM public.customers WHERE id = p_customer_id;
  END IF;

  INSERT INTO public.sales (user_id, customer_id, payment_mode, amount_paid, note)
  VALUES (v_uid, p_customer_id, p_payment_mode, p_amount_paid, p_note)
  RETURNING id INTO v_sale_id;

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

    UPDATE public.products
      SET stock_qty = stock_qty - (v_item->>'qty')::numeric,
          updated_at = now()
      WHERE id = (v_item->>'product_id')::uuid;

    v_total := v_total + (v_item->>'sell_price')::numeric * (v_item->>'qty')::numeric;
    v_cost_total := v_cost_total + COALESCE((v_item->>'cost_price')::numeric,0) * (v_item->>'qty')::numeric;
  END LOOP;

  UPDATE public.sales SET total = v_total, cost_total = v_cost_total WHERE id = v_sale_id;

  IF p_amount_paid > 0 THEN
    INSERT INTO public.cash_transactions (user_id, direction, amount, category, note, reference_id, party_id, party_name)
    VALUES (v_uid, 'in', p_amount_paid, 'sale', 'Sale payment', v_sale_id, p_customer_id, v_party_name);
  END IF;

  v_credit := v_total - p_amount_paid;
  IF p_customer_id IS NOT NULL AND v_credit <> 0 THEN
    UPDATE public.customers SET balance = balance + v_credit WHERE id = p_customer_id;
    INSERT INTO public.ledger_entries (user_id, party_type, party_id, entry_type, amount, reference_id, note)
    VALUES (v_uid, 'customer', p_customer_id, CASE WHEN v_credit>0 THEN 'debit' ELSE 'credit' END, ABS(v_credit), v_sale_id, 'Sale on credit');
  END IF;

  RETURN v_sale_id;
END;
$$;

-- 2. record_purchase
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
  v_party_name TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- Get supplier name
  IF p_supplier_id IS NOT NULL THEN
    SELECT name INTO v_party_name FROM public.suppliers WHERE id = p_supplier_id;
  END IF;

  INSERT INTO public.purchases (user_id, supplier_id, payment_mode, amount_paid, note)
  VALUES (v_uid, p_supplier_id, p_payment_mode, p_amount_paid, p_note)
  RETURNING id INTO v_pid;

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
      WHERE id = (v_item->>'product_id')::uuid;

    v_total := v_total + (v_item->>'cost_price')::numeric * (v_item->>'qty')::numeric;
  END LOOP;

  UPDATE public.purchases SET total = v_total WHERE id = v_pid;

  IF p_amount_paid > 0 THEN
    INSERT INTO public.cash_transactions (user_id, direction, amount, category, note, reference_id, party_id, party_name)
    VALUES (v_uid, 'out', p_amount_paid, 'purchase', 'Purchase payment', v_pid, p_supplier_id, v_party_name);
  END IF;

  v_credit := v_total - p_amount_paid;
  IF p_supplier_id IS NOT NULL AND v_credit <> 0 THEN
    UPDATE public.suppliers SET balance = balance + v_credit WHERE id = p_supplier_id;
    INSERT INTO public.ledger_entries (user_id, party_type, party_id, entry_type, amount, reference_id, note)
    VALUES (v_uid, 'supplier', p_supplier_id, CASE WHEN v_credit>0 THEN 'credit' ELSE 'debit' END, ABS(v_credit), v_pid, 'Purchase on credit');
  END IF;

  RETURN v_pid;
END;
$$;

-- 3. record_party_payment
CREATE OR REPLACE FUNCTION public.record_party_payment(
  p_party_type TEXT,
  p_party_id UUID,
  p_amount NUMERIC,
  p_note TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_party_name TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  IF p_party_type = 'customer' THEN
    SELECT name INTO v_party_name FROM public.customers WHERE id = p_party_id;
    
    UPDATE public.customers SET balance = balance - p_amount WHERE id = p_party_id;
    INSERT INTO public.cash_transactions (user_id, direction, amount, category, note, party_id, party_name)
      VALUES (v_uid, 'in', p_amount, 'customer_payment', COALESCE(p_note,'Customer payment'), p_party_id, v_party_name);
    INSERT INTO public.ledger_entries (user_id, party_type, party_id, entry_type, amount, note)
      VALUES (v_uid, 'customer', p_party_id, 'payment_in', p_amount, p_note);
  ELSE
    SELECT name INTO v_party_name FROM public.suppliers WHERE id = p_party_id;

    UPDATE public.suppliers SET balance = balance - p_amount WHERE id = p_party_id;
    INSERT INTO public.cash_transactions (user_id, direction, amount, category, note, party_id, party_name)
      VALUES (v_uid, 'out', p_amount, 'supplier_payment', COALESCE(p_note,'Supplier payment'), p_party_id, v_party_name);
    INSERT INTO public.ledger_entries (user_id, party_type, party_id, entry_type, amount, note)
      VALUES (v_uid, 'supplier', p_party_id, 'payment_out', p_amount, p_note);
  END IF;
END;
$$;
