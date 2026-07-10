import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth/reset")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { email: string } => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
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
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: ResetForm) {
    if (code.length < 6) {
      toast.error("Inserisci il codice di 6 cifre.");
      return;
    }
    setVerifying(true);
    try {
      // 'recovery' è supportato a runtime ma assente nel tipo pubblico di questa
      // versione di supabase-js (presente solo lato admin), perciò castiamo il
      // parametro al tipo atteso senza usare `any`.
      const otpParams = {
        email,
        token: code,
        type: "recovery",
      } as unknown as Parameters<typeof supabase.auth.verifyOtp>[0];
      const { error: otpError } = await supabase.auth.verifyOtp(otpParams);
      if (otpError) throw otpError;

      const { error: pwError } = await supabase.auth.updateUser({
        password: values.password,
      });
      if (pwError) throw pwError;

      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate({ to: "/auth" }), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      toast.error(
        msg.includes("Token") || msg.includes("otp") ? "Codice non valido o scaduto." : msg,
      );
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Codice inviato di nuovo.");
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="container-app flex flex-1 flex-col justify-center py-16">
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-4 text-sm font-semibold">Password aggiornata</p>
            <p className="mt-1 text-xs text-muted-foreground">Verrai reindirizzato al login…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container-app flex flex-1 flex-col justify-center py-16">
        <button
          type="button"
          onClick={() => navigate({ to: "/auth" })}
          className="mb-8 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Login
        </button>

        <div className="mb-8">
          <div className="text-4xl font-black tracking-tighter">Reset password</div>
          <p className="mt-3 text-sm text-muted-foreground">
            Inserisci il codice ricevuto a{" "}
            <span className="font-semibold text-foreground">{email}</span> e scegli una nuova
            password.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(v) => setCode(v.replace(/\D/g, ""))}
              autoFocus
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

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
            disabled={isSubmitting || verifying}
            className="no-tap-highlight flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {isSubmitting || verifying ? "…" : "Aggiorna password"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            className="block w-full text-center text-xs font-semibold text-muted-foreground"
          >
            Non hai ricevuto il codice? Inviane un altro
          </button>
        </form>
      </div>
    </div>
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
