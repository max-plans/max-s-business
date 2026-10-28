-- La clé Stripe vit dans le coffre chiffré (vault.secrets, nom 'stripe_secret_key'), jamais dans le dépôt.
-- Seule la fonction billing (service_role) peut la lire.
create or replace function public.stripe_secret_key() returns text language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'stripe_secret_key' limit 1
$$;
revoke all on function public.stripe_secret_key() from public, anon, authenticated;
grant execute on function public.stripe_secret_key() to service_role;
