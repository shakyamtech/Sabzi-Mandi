
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  shop_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sell_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(12,3) NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own products all" ON public.products FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CUSTOMERS
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own customers all" ON public.customers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SUPPLIERS
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own suppliers all" ON public.suppliers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SALES
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'cash', -- cash | credit
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sales all" ON public.sales FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty NUMERIC(12,3) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  sell_price NUMERIC(12,2) NOT NULL,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(12,2) NOT NULL
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sale_items all" ON public.sale_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PURCHASES
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'cash',
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own purchases all" ON public.purchases FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  qty NUMERIC(12,3) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  cost_price NUMERIC(12,2) NOT NULL,
  line_total NUMERIC(12,2) NOT NULL
);
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own purchase_items all" ON public.purchase_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- LEDGER ENTRIES (customers & suppliers)
CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL, -- 'customer' | 'supplier'
  party_id UUID NOT NULL,
  entry_type TEXT NOT NULL, -- 'debit' | 'credit' | 'payment_in' | 'payment_out'
  amount NUMERIC(12,2) NOT NULL,
  reference_id UUID, -- sale_id or purchase_id
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ledger all" ON public.ledger_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CASH TRANSACTIONS
CREATE TABLE public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'in' | 'out'
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'other', -- sale, purchase, expense, opening, drawing, other
  note TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cash all" ON public.cash_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- EXPENSES
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  amount NUMERIC(12,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own expenses all" ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TRIGGER: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, shop_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'shop_name', 'My Vegetable Shop')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RPC: checkout_sale - creates sale, items, deducts stock, updates customer balance, cash entry
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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

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
      WHERE id = (v_item->>'product_id')::uuid AND user_id = v_uid;

    v_total := v_total + (v_item->>'sell_price')::numeric * (v_item->>'qty')::numeric;
    v_cost_total := v_cost_total + COALESCE((v_item->>'cost_price')::numeric,0) * (v_item->>'qty')::numeric;
  END LOOP;

  UPDATE public.sales SET total = v_total, cost_total = v_cost_total WHERE id = v_sale_id;

  IF p_amount_paid > 0 THEN
    INSERT INTO public.cash_transactions (user_id, direction, amount, category, note, reference_id)
    VALUES (v_uid, 'in', p_amount_paid, 'sale', 'Sale payment', v_sale_id);
  END IF;

  v_credit := v_total - p_amount_paid;
  IF p_customer_id IS NOT NULL AND v_credit <> 0 THEN
    UPDATE public.customers SET balance = balance + v_credit WHERE id = p_customer_id AND user_id = v_uid;
    INSERT INTO public.ledger_entries (user_id, party_type, party_id, entry_type, amount, reference_id, note)
    VALUES (v_uid, 'customer', p_customer_id, CASE WHEN v_credit>0 THEN 'debit' ELSE 'credit' END, ABS(v_credit), v_sale_id, 'Sale on credit');
  END IF;

  RETURN v_sale_id;
END;
$$;

-- RPC: record_purchase
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
      WHERE id = (v_item->>'product_id')::uuid AND user_id = v_uid;

    v_total := v_total + (v_item->>'cost_price')::numeric * (v_item->>'qty')::numeric;
  END LOOP;

  UPDATE public.purchases SET total = v_total WHERE id = v_pid;

  IF p_amount_paid > 0 THEN
    INSERT INTO public.cash_transactions (user_id, direction, amount, category, note, reference_id)
    VALUES (v_uid, 'out', p_amount_paid, 'purchase', 'Purchase payment', v_pid);
  END IF;

  v_credit := v_total - p_amount_paid;
  IF p_supplier_id IS NOT NULL AND v_credit <> 0 THEN
    UPDATE public.suppliers SET balance = balance + v_credit WHERE id = p_supplier_id AND user_id = v_uid;
    INSERT INTO public.ledger_entries (user_id, party_type, party_id, entry_type, amount, reference_id, note)
    VALUES (v_uid, 'supplier', p_supplier_id, CASE WHEN v_credit>0 THEN 'credit' ELSE 'debit' END, ABS(v_credit), v_pid, 'Purchase on credit');
  END IF;

  RETURN v_pid;
END;
$$;

-- RPC: record customer payment
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
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  IF p_party_type = 'customer' THEN
    UPDATE public.customers SET balance = balance - p_amount WHERE id = p_party_id AND user_id = v_uid;
    INSERT INTO public.cash_transactions (user_id, direction, amount, category, note)
      VALUES (v_uid, 'in', p_amount, 'customer_payment', COALESCE(p_note,'Customer payment'));
    INSERT INTO public.ledger_entries (user_id, party_type, party_id, entry_type, amount, note)
      VALUES (v_uid, 'customer', p_party_id, 'payment_in', p_amount, p_note);
  ELSE
    UPDATE public.suppliers SET balance = balance - p_amount WHERE id = p_party_id AND user_id = v_uid;
    INSERT INTO public.cash_transactions (user_id, direction, amount, category, note)
      VALUES (v_uid, 'out', p_amount, 'supplier_payment', COALESCE(p_note,'Supplier payment'));
    INSERT INTO public.ledger_entries (user_id, party_type, party_id, entry_type, amount, note)
      VALUES (v_uid, 'supplier', p_party_id, 'payment_out', p_amount, p_note);
  END IF;
END;
$$;
