
REVOKE EXECUTE ON FUNCTION public.checkout_sale(UUID, TEXT, NUMERIC, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_purchase(UUID, TEXT, NUMERIC, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_party_payment(TEXT, UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.checkout_sale(UUID, TEXT, NUMERIC, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_purchase(UUID, TEXT, NUMERIC, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_party_payment(TEXT, UUID, NUMERIC, TEXT) TO authenticated;
