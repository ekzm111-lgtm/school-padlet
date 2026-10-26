import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gllcqmszqmtdpxllhulq.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_S5bLoutk74W1h9FznGcaZg_aIkNhzup';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
