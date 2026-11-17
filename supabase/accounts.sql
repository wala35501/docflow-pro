-- DocFlowStudio : un account per studio. A eseguire UNA volta nello SQL Editor di Supabase.

-- 1. Ogni cliente appartiene a uno studio (utente Supabase)
alter table clients add column if not exists owner_id uuid references auth.users(id) on delete cascade;
create index if not exists clients_owner_id_idx on clients (owner_id);

-- 2. Dopo aver creato il TUO account sul sito, assegna i clienti esistenti al tuo account.
--    Sostituisci l'email qui sotto con quella del tuo account e lancia questa riga:
-- update clients set owner_id = (select id from auth.users where email = 'LA-TUA-EMAIL') where owner_id is null;
