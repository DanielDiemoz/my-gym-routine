-- Migration: cleanup delle sessioni "orfane" di GymBro.
-- Una sessione orfana è una riga in public.sessions con started_at valorizzato
-- ma completed_at IS NULL (workout non chiuso per crash/refresh/errore di rete).
-- Questa migrazione crea una funzione SECURITY DEFINER che le elimina dopo 24h
-- e prova a schedularla giornalmente via pg_cron (se l'estensione è abilitata).

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.sessions
  WHERE completed_at IS NULL
    AND started_at < (NOW() - INTERVAL '24 hours');
END;
$$;

-- Lo schedule è opzionale: richiede pg_cron attivo su Supabase.
-- Se l'estensione non è disponibile, un Edge Function / cron-job esterno può invocare
-- la funzione con `SELECT cleanup_orphaned_sessions()`.
-- Il blocco è idempotente: `cron.unschedule` fallisce silenziosamente se il job
-- non esiste (tipico della prima esecuzione della migration su DB pulito).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('gymbro-cleanup-orphans');
    EXCEPTION WHEN OTHERS THEN
      -- Job non ancora registrato: nessun problema, procediamo con schedule().
      NULL;
    END;
    PERFORM cron.schedule(
      'gymbro-cleanup-orphans',
      '0 3 * * *',
      $cron$SELECT public.cleanup_orphaned_sessions()$cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron non abilitato: la funzione cleanup_orphaned_sessions() è disponibile ma non schedulata. Invocare manualmente o da Edge Function.';
  END IF;
END $$;
