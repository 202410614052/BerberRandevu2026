import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "VITE_SUPABASE_URL bulunamadı. .env.local dosyasını kontrol edin."
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "VITE_SUPABASE_PUBLISHABLE_KEY bulunamadı. .env.local dosyasını kontrol edin."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);