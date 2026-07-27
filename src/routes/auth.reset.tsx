import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { OTP_LENGTH } from "@/lib/otp";
import { useLanguage, tx } from "@/lib/i18n";

export const Route = createFileRoute("/auth/reset")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { email: string } => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  component: AuthResetPage,
});

const resetSchema = z
  .object({
    password: z.string().min(6, tx("Minimo 6 caratteri", "At least 6 characters")),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: tx("Le password non coincidono", "Passwords do not match"),
    path: ["confirm"],
  });

type ResetForm = z.infer<typeof resetSchema>;

function AuthResetPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
    if (code.length < OTP_LENGTH) {
      toast.error(
        t(`Inserisci il codice di ${OTP_LENGTH} cifre.`, `Enter the ${OTP_LENGTH}-digit code.`),
      );
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
        msg.includes("Token") || msg.includes("otp")
          ? t("Codice non valido o scaduto.", "Invalid or expired code.")
          : msg,
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
    toast.success(t("Codice inviato di nuovo.", "Code sent again."));
  }

  if (done) {
    return (
      <div className="w-full max-w-md mx-auto rounded-2xl border border-border bg-card p-6 text-center animate-in fade-in duration-300">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <p className="mt-4 text-sm font-semibold">{t("Password aggiornata", "Password updated")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("Verrai reindirizzato al login…", "You will be redirected to login…")}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in duration-500">
      <button
        type="button"
        onClick={() => navigate({ to: "/auth" })}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="h-4 w-4" /> {t("Login", "Login")}
      </button>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {t("Reset password", "Reset password")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Inserisci il codice ricevuto a", "Enter the code received at")}{" "}
          <span className="font-semibold text-foreground break-all">{email}</span>{" "}
          {t("e scegli una nuova password.", "and choose a new password.")}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            maxLength={OTP_LENGTH}
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, ""))}
            autoFocus
          >
            <InputOTPGroup className="gap-1.5">
              {Array.from({ length: OTP_LENGTH }, (_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="h-12 w-9 rounded-xl border border-border text-base font-bold shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-primary"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Field
          label={t("Nuova password", "New password")}
          type="password"
          registration={register("password")}
          error={errors.password?.message}
          autoComplete="new-password"
        />
        <Field
          label={t("Conferma password", "Confirm password")}
          type="password"
          registration={register("confirm")}
          error={errors.confirm?.message}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={isSubmitting || verifying}
          className="no-tap-highlight flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          {isSubmitting || verifying ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            t("Aggiorna password", "Update password")
          )}
        </button>

        <button
          type="button"
          onClick={handleResend}
          className="block w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground transition underline underline-offset-2"
        >
          {t("Non hai ricevuto il codice? Inviane un altro", "Didn't get the code? Send another")}
        </button>
      </form>
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
