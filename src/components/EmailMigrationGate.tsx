import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { isLegacyEmail } from "@/lib/legacy-email";
import { OTP_LENGTH } from "@/lib/otp";
import { useLanguage } from "@/lib/i18n";

export function EmailMigrationGate({ user }: { user: { id: string; email?: string | null } }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Una volta confermata l'email reale, l'evento USER_UPDATED aggiorna il
  // loader e l'app si sblocca. Se l'utente torna dopo aver confermato da
  // un altro browser, forziamo il refresh dello stato di autenticazione.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "USER_UPDATED" && session?.user) {
        if (!isLegacyEmail(session.user.email)) {
          navigate({ to: "/app" }).catch(() => {});
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmitEmail() {
    const value = email.trim();
    if (!value) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: value });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success(
      t("Codice di conferma inviato alla tua email.", "Confirmation code sent to your email."),
    );
  }

  async function handleVerify() {
    const value = email.trim();
    if (code.length < OTP_LENGTH) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: value,
      token: code,
      type: "email_change",
    });
    setVerifying(false);
    if (error) {
      toast.error(t("Codice non valido o scaduto.", "Invalid or expired code."));
      return;
    }
    toast.success(t("Email confermata!", "Email confirmed!"));
    navigate({ to: "/app" }).catch(() => {});
  }

  async function handleResend() {
    const value = email.trim();
    const { error } = await supabase.auth.resend({ type: "email_change", email: value });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("Codice inviato di nuovo.", "Code sent again."));
  }

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen flex-col bg-background">
      <div className="container-app flex flex-1 flex-col justify-center py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Mail className="h-6 w-6" />
          </div>
          <div className="text-3xl font-black tracking-tighter">GymBro</div>
        </div>

        {!sent ? (
          <>
            <h1 className="text-2xl font-bold">{t("Aggiungi la tua email", "Add your email")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {t(
                "Il tuo account è stato creato con solo username. Per poter recuperare la password e continuare a usare GymBro devi collegare un'email reale. Non puoi usare l'app finché non lo fai.",
                "Your account was created with username only. To recover your password and keep using GymBro you must link a real email. You can't use the app until you do.",
              )}
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("Email", "Email")}
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@example.com"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none transition focus:border-foreground"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmitEmail}
                disabled={saving || !email.trim()}
                className="no-tap-highlight flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? t("Invio…", "Sending…") : t("Invia codice", "Send code")}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{t("Inserisci il codice", "Enter the code")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("Abbiamo inviato un codice di conferma a ", "We sent a confirmation code to ")}
              <span className="font-semibold text-foreground">{email.trim()}</span>.{" "}
              {t("Inseriscilo per attivare l'account.", "Enter it to activate your account.")}
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={OTP_LENGTH}
                  value={code}
                  onChange={(v) => setCode(v.replace(/\D/g, ""))}
                >
                  <InputOTPGroup>
                    {Array.from({ length: OTP_LENGTH }, (_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || code.length < OTP_LENGTH}
                className="no-tap-highlight flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
              >
                {verifying ? t("Verifica…", "Verifying…") : t("Conferma", "Confirm")}
              </button>

              <button
                type="button"
                onClick={handleResend}
                className="block w-full text-center text-xs font-semibold text-muted-foreground"
              >
                {t(
                  "Non hai ricevuto il codice? Inviane un altro",
                  "Didn't get the code? Send another",
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
