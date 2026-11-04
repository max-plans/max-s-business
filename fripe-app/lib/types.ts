import type { Activity } from './fmt';

export type Business = {
  id: string; owner: string; name: string; slug: string | null; metier: string; bio: string; legal_name: string; address: string; siret: string;
  email: string; phone: string; activity: Activity; urssaf_rate: number; deposit_percent: number; min_notice_hours: number; window_days: number;
  buffer_min: number; cancel_hours: number; stripe_account_id: string | null; stripe_ready: boolean; onboarded: boolean;
};
export type Account = { plan: 'free' | 'pro'; pro_until: string | null; is_admin: boolean; cancel_at_period_end: boolean };
export type Service = { id: string; business_id: string; name: string; description: string; duration_min: number; price_cents: number; deposit_cents: number | null; active: boolean; position: number };
export type Hour = { id: string; business_id: string; weekday: number; start_min: number; end_min: number };
export type Client = { id: string; business_id: string; name: string; email: string; phone: string; address: string; notes: string; created_at: string };
export type Booking = {
  id: string; business_id: string; service_id: string | null; client_id: string | null; title: string; starts_at: string; ends_at: string;
  price_cents: number; deposit_cents: number; status: 'pending' | 'confirmed' | 'done' | 'cancelled' | 'no_show';
  deposit_status: 'none' | 'pending' | 'paid' | 'refunded' | 'kept'; source: 'page' | 'manual' | 'ai'; notes: string; public_token: string; created_at: string;
};
export type Item = { label: string; qty: number; unit_cents: number };
export type Doc = {
  id: string; business_id: string; kind: 'invoice' | 'quote'; number: string | null; status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'accepted' | 'refused';
  client_id: string | null; booking_id: string | null; items: Item[]; total_cents: number; issued_on: string | null; due_on: string | null; notes: string;
  public_token: string; client_snapshot: { name?: string; email?: string; phone?: string; address?: string }; last_reminder_at: string | null; created_at: string;
};
export type Payment = { id: string; business_id: string; booking_id: string | null; document_id: string | null; client_id: string | null; label: string; amount_cents: number; method: 'card' | 'cash' | 'transfer' | 'stripe' | 'other'; paid_on: string; created_at: string };
export type Expense = { id: string; business_id: string; label: string; category: string; amount_cents: number; spent_on: string };

export const METHODS: Record<Payment['method'], string> = { card: 'Carte', cash: 'Espèces', transfer: 'Virement', stripe: 'En ligne', other: 'Autre' };
export const EXPENSE_CATS: Record<string, string> = { materiel: 'Produits et matériel', deplacement: 'Déplacements', logiciel: 'Logiciels et abonnements', formation: 'Formation', local: 'Local', pub: 'Publicité', autre: 'Autre' };
export const docTotal = (items: Item[]) => items.reduce((s, i) => s + Math.round((Number(i.qty) || 0) * (Number(i.unit_cents) || 0)), 0);
