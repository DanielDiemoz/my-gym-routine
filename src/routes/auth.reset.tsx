import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/auth/reset")({
  ssr: false,
  component: AuthResetPage,
});

const resetSchema = z
  .object({
    password: z.string().min(6, "Minimo 6 caratteri"),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Le password non coincidono",
    path: ["confirm"],
  });

type ResetForm = z.infer<typeof resetSchema>;

function AuthResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Il link Supabase include i token nell'URL; detectSessionFromUrl li consuma
  // e crea una sessione effimera per consentire aggiornamento password.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hash = window.location.hash;
      if (!hash.includes("access_token") && !hash.includes("type=recovery")) {
        // Niente token recovery → redirect al login.
        toast.error("Link di reset non valido o scaduto.");
        navigate({ to: "/auth" });
        return;
      }
      // Lascia che supabase-js gestisca il fragment hash internamente.
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error || !data.session) {
        // Tenta ancora: supabase-js di default gestisce l'hash automaticamente.
        setHasSession(false);
      } else {
        setHasSession(true);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  function onSessionChange(_event: string, session: { user: { id: string } } | null) {
    if (session?.user) setHasSession(true);
  }

  // Ascolta AUTH events come safety net per il flusso recovery.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session?.user && !hasSession)) {
        onSessionChange(event, session);
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container-app flex flex-1 flex-col justify-center py-16">
        <Link
          to="/auth"
          className="mb-8 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Login
        </Link>

        <div className="mb-8">
          <div className="text-4xl font-black tracking-tighter">Reset password</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Imposta una nuova password per il tuo account.
          </p>
        </div>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Verifica link in corso…</p>
        ) : !hasSession ? (
          <div className="rounded-2xl border border-destructive/40 bg-card p-6 text-center">
            <p className="text-sm font-semibold text-destructive">
              Link di reset non valido o scaduto.
            </p>
            <Link
              to="/auth"
              className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
            >
              Torna al login
            </Link>
          </div>
        ) : (
          <NewPasswordForm
            onDone={() => {
              toast.success("Password aggiornata. Ora accedi.");
              navigate({ to: "/auth" });
            }}
          />
        )}
      </div>
    </div>
  );
}

function NewPasswordForm({ onDone }: { onDone: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const [done, setDone] = useState(false);

  async function onSubmit(values: ResetForm) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (error) throw error;
      setDone(true);
      // Logout per evitare che l'utente atri auto-authenticated dopo il reset.
      await supabase.auth.signOut();
      setTimeout(onDone, 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <p className="mt-4 text-sm font-semibold">Password aggiornata</p>
        <p className="mt-1 text-xs text-muted-foreground">Verrai reindirizzato al login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field
        label="Nuova password"
        type="password"
        registration={register("password")}
        error={errors.password?.message}
        autoComplete="new-password"
      />
      <Field
        label="Conferma password"
        type="password"
        registration={register("confirm")}
        error={errors.confirm?.message}
        autoComplete="new-password"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="no-tap-highlight flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
      >
        {isSubmitting ? "..." : "Aggiorna password"}
      </button>
    </form>
  );
}

function Field({
  label,
  type,
  registration,
  error,
  autoComplete,
}: {
  label: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registration: any;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        autoComplete={autoComplete}
        {...registration}
        className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none transition focus:border-foreground"
      />
      {error && <p className="mt-1.5 text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}
