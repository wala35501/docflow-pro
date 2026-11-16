import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient> | null = null;

// Les cles publiques sont lues au demarrage du serveur (route /api/v1/config),
// pas figees dans le build : on peut les changer dans .env.production sans reconstruire.
export function getBrowserClient(): Promise<SupabaseClient> {
    if (!clientPromise) {
        clientPromise = fetch('/api/v1/config', { cache: 'no-store' })
            .then((res) => res.json())
            .then((cfg: { supabaseUrl?: string; anonKey?: string }) => {
                if (!cfg.supabaseUrl || !cfg.anonKey) {
                    throw new Error(
                        'Configurazione di accesso mancante: aggiungi NEXT_PUBLIC_SUPABASE_ANON_KEY nel file .env.production.'
                    );
                }
                return createClient(cfg.supabaseUrl, cfg.anonKey, {
                    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
                });
            });
        clientPromise.catch(() => {
            clientPromise = null;
        });
    }
    return clientPromise;
}
