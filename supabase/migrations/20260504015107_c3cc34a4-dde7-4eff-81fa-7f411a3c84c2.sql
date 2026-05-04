CREATE OR REPLACE FUNCTION public.delete_purchase(p_purchase_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_purchase RECORD;
  v_item RECORD;
  v_credit NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_purchase FROM public.purchases WHERE id = p_purchase_id AND user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'purchase not found'; END IF;

  -- Reverse stock
  FOR v_item IN SELECT * FROM public.purchase_items WHERE purchase_id = p_purchase_id AND user_id = v_uid LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products SET stock_qty = stock_qty - v_item.qty, updated_at = now()
        WHERE id = v_item.product_id AND user_id = v_uid;
    END IF;
  END LOOP;

  -- Reverse supplier credit
  v_credit := v_purchase.total - v_purchase.amount_paid;
  IF v_purchase.supplier_id IS NOT NULL AND v_credit <> 0 THEN
    UPDATE public.suppliers SET balance = balance - v_credit WHERE id = v_purchase.supplier_id AND user_id = v_uid;
  END IF;

  -- Remove related cash & ledger entries
  DELETE FROM public.cash_transactions WHERE reference_id = p_purchase_id AND user_id = v_uid;
  DELETE FROM public.ledger_entries WHERE reference_id = p_purchase_id AND user_id = v_uid;
  DELETE FROM public.purchase_items WHERE purchase_id = p_purchase_id AND user_id = v_uid;
  DELETE FROM public.purchases WHERE id = p_purchase_id AND user_id = v_uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_sale(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_sale RECORD;
  v_item RECORD;
  v_credit NUMERIC;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_sale FROM public.sales WHERE id = p_sale_id AND user_id = v_uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'sale not found'; END IF;

  FOR v_item IN SELECT * FROM public.sale_items WHERE sale_id = p_sale_id AND user_id = v_uid LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products SET stock_qty = stock_qty + v_item.qty, updated_at = now()
        WHERE id = v_item.product_id AND user_id = v_uid;
    END IF;
  END LOOP;

  v_credit := v_sale.total - v_sale.amount_paid;
  IF v_sale.customer_id IS NOT NULL AND v_credit <> 0 THEN
    UPDATE public.customers SET balance = balance - v_credit WHERE id = v_sale.customer_id AND user_id = v_uid;
  END IF;

  DELETE FROM public.cash_transactions WHERE reference_id = p_sale_id AND user_id = v_uid;
  DELETE FROM public.ledger_entries WHERE reference_id = p_sale_id AND user_id = v_uid;
  DELETE FROM public.sale_items WHERE sale_id = p_sale_id AND user_id = v_uid;
  DELETE FROM public.sales WHERE id = p_sale_id AND user_id = v_uid;
END;
$$;