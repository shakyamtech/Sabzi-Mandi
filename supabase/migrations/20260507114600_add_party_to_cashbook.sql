-- Add party information to cash_transactions for better tracking
ALTER TABLE public.cash_transactions 
ADD COLUMN IF NOT EXISTS party_id UUID,
ADD COLUMN IF NOT EXISTS party_name TEXT;

-- Update RLS to ensure data integrity
-- (Existing policy "own cash all" already covers these new columns)
