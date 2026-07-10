import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { isLegacyEmail } from "@/lib/legacy-email";

export function EmailMigrationGate({ user }: { user: { id: string; email?: string | null } }) {
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
          navigate({ to: "/" }).catch(() => {});
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
    toast.success("Codice di conferma inviato alla tua email.");
  }

  async function handleVerify() {
    const value = email.trim();
    if (code.length < 6) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: value,
      token: code,
      type: "email_change",
    });
    setVerifying(false);
    if (error) {
      toast.error("Codice non valido o scaduto.");
      return;
    }
    toast.success("Email confermata!");
    navigate({ to: "/" }).catch(() => {});
  }

  async function handleResend() {
    const value = email.trim();
    const { error } = await supabase.auth.resend({ type: "email_change", email: value });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Codice inviato di nuovo.");
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
            <h1 className="text-2xl font-bold">Aggiungi la tua email</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Il tuo account è stato creato con solo username. Per poter recuperare la password e
              continuare a usare GymBro devi collegare un'email reale. Non puoi usare l'app finché
              non lo fai.
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
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
                {saving ? "Invio…" : "Invia codice"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Inserisci il codice</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Abbiamo inviato un codice di conferma a{" "}
              <span className="font-semibold text-foreground">{email.trim()}</span>. Inseriscilo per
              attivare l'account.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(v) => setCode(v.replace(/\D/g, ""))}
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

              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || code.length < 6}
                className="no-tap-highlight flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
              >
                {verifying ? "Verifica…" : "Conferma"}
              </button>

              <button
                type="button"
                onClick={handleResend}
                className="block w-full text-center text-xs font-semibold text-muted-foreground"
              >
                Non hai ricevuto il codice? Inviane un altro
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
