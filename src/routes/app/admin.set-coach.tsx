import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * Pagina admin — TASK 6.
 * Endpoint "segreto" per promuovere un utente a coach.
 * - Si accede via URL `/admin/set-coach?userId=<UUID>&secret=GYMBRO_ADMIN_2024`.
 * - Se il segreto è errato → redirect a "/".
 * - Se corretto → UPDATE profiles SET role = 'coach' WHERE id = <userId>.
 *
 * ⚠️ ATTENZIONE — Questo è solo un workaround temporaneo per ambienti dev.
 * In produzione questa operazione DEVE essere protetta lato server
 * (es. Edge Function Supabase con service_role key, gated da un sistema di
 * autenticazione admin robusto). L'uso della secret in chiaro nell'URL e
 * dell'update client-side NON È SICURO e NON scala.
 */
export const Route = createFileRoute("/app/admin/set-coach")({
  ssr: false,
  component: SetCoachPage,
});

// Cambia qui se vuoi ruotare la secret. Ricorda di aggiornare anche la invariante
// sotto e di non fare commit della secret aggiornata su branch pubblici.
const ADMIN_SECRET = "GYMBRO_ADMIN_2024";

type Status = "checking" | "running" | "done" | "error";

function SetCoachPage() {
  // Validazione SYNC del segreto PRIMA di renderizzare la pagina.
  // Restituiamo redirect in modo che l'utente sbagliato non veda mai nulla.
  const navigate = useNavigate();
  const search = Route.useSearch() as Record<string, string | undefined>;
  const userId = search?.userId?.trim();
  const secret = search?.secret;

  useEffect(() => {
    if (secret !== ADMIN_SECRET) {
      // piccolo toast prima del redirect
      // eslint-disable-next-line no-console
      console.warn("[admin] secret non valida → redirect /");
      navigate({ to: "/app" });
    }
  }, [secret, navigate]);

  if (secret !== ADMIN_SECRET) {
    return null;
  }

  return <PromoteFlow userId={userId} />;
}

function PromoteFlow({ userId }: { userId: string | undefined }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setStatus("error");
      setError("Parametro userId mancante. Aggiungi ?userId=<UUID> all'URL.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setStatus("running");
        // Cast esplicito perché `role` non è ancora nel Database type.
        const { error: updateErr } = await supabase
          .from("profiles")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ role: "coach" } as any)
          .eq("id", userId);
        if (cancelled) return;
        if (updateErr) throw updateErr;
        setStatus("done");
        // TASK 6 — Dopo la promozione a coach, le cache di `useCircle.ts`
        // sono stale (5 min). Invalidiamo per far comparire subito il
        // bottone "Crea cerchia" nella pagina /cerchia.
        qc.invalidateQueries({ queryKey: ["profile-role", userId] });
        qc.invalidateQueries({ queryKey: ["circles", userId] });
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Errore");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, qc]);

  return (
    <div className="container-app flex min-h-screen flex-col py-12">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Admin · Promozione coach
          </p>
          <h1 className="text-2xl font-black tracking-tight">Set role</h1>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        {status === "checking" && (
          <p className="text-sm text-muted-foreground">Recupero utente…</p>
        )}
        {status === "running" && (
          <p className="text-sm text-muted-foreground">Aggiornamento in corso…</p>
        )}
        {status === "done" && (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              ✓
            </div>
            <div>
              <p className="text-base font-bold">Utente promosso a coach ✅</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aggiorna il profilo o ricarica la pagina per vedere le funzioni coach.
              </p>
              <code className="mt-3 inline-block break-all rounded-lg bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                userId: {userId}
              </code>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Operazione fallita</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {error ?? "Errore sconosciuto."} Le policy RLS potrebbero bloccare
                l'update client-side: nel dubbio, promuovi via SQL Editor di Supabase:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-muted px-2 py-1 text-[10px] text-muted-foreground">
{`UPDATE profiles SET role = 'coach' WHERE id = '${userId}';`}
              </pre>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-[10px] uppercase tracking-widest text-muted-foreground">
        ⚠️ Pagina solo dev. Mai esporre in produzione senza protezione server-side.
      </p>
    </div>
  );
}
