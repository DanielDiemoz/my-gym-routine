import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { OTP_LENGTH } from "@/lib/otp";

export const Route = createFileRoute("/auth/verify")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { email: string } => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  component: VerifyPage,
});

function getEmailVerificationUrl(email: string) {
  const url = new URL("/auth/verify", window.location.origin);
  url.searchParams.set("email", email);
  return url.toString();
}

function getAuthParam(name: string) {
  if (typeof window === "undefined") return null;
  const queryValue = new URLSearchParams(window.location.search).get(name);
  if (queryValue) return queryValue;
  return new URLSearchParams(window.location.hash.replace(/^#/, "")).get(name);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function VerifyPage() {
  const { email: searchEmail } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState(() => normalizeEmail(searchEmail));
  const [emailInput, setEmailInput] = useState(() => normalizeEmail(searchEmail));
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function completeLinkSignIn() {
      const authError = getAuthParam("error_description") || getAuthParam("error");
      if (authError) {
        toast.error(decodeURIComponent(authError).replace(/\+/g, " "));
        setCheckingLink(false);
        return;
      }

      const tokenHash = getAuthParam("token_hash");
      const type = getAuthParam("type") || "signup";

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (cancelled) return;
        if (error) {
          toast.error("Link di conferma non valido o scaduto.");
          setCheckingLink(false);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        toast.success("Email confermata! Benvenuto.");
        navigate({ to: "/" });
        return;
      }

      setCheckingLink(false);
    }

    completeLinkSignIn();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: "/" });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleVerify() {
    if (!email) {
      toast.error("Inserisci prima la tua email.");
      return;
    }
    if (code.length < OTP_LENGTH) return;
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    setVerifying(false);
    if (error) {
      toast.error("Codice non valido o scaduto.");
      return;
    }
    toast.success("Email confermata! Benvenuto.");
    navigate({ to: "/" });
  }

  async function handleResend() {
    if (!email) {
      toast.error("Inserisci prima la tua email.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: getEmailVerificationUrl(email) },
    });
    setResending(false);
    if (error) {
      const msg = error.message.toLowerCase();
      toast.error(
        msg.includes("already confirmed")
          ? "Email già confermata. Accedi dal login."
          : error.message,
      );
      return;
    }
    toast.success("Codice inviato di nuovo.");
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = normalizeEmail(emailInput);
    if (!isValidEmail(nextEmail)) {
      toast.error("Inserisci un'email valida.");
      return;
    }
    setEmail(nextEmail);
    setEmailInput(nextEmail);
    navigate({ to: "/auth/verify", search: { email: nextEmail }, replace: true });
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: nextEmail,
      options: { emailRedirectTo: getEmailVerificationUrl(nextEmail) },
    });
    setResending(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already confirmed")) {
        toast.info("Email già confermata. Accedi dal login.");
        return;
      }
      toast.error(error.message);
      return;
    }
    toast.success("Codice di conferma inviato alla tua email.");
  }

  if (checkingLink) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="container-app flex flex-1 flex-col justify-center py-16">
          <div className="text-center">
            <div className="text-3xl font-black tracking-tighter">GymBro</div>
            <p className="mt-3 text-sm text-muted-foreground">Verifica in corso...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container-app flex flex-1 flex-col justify-center py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Mail className="h-6 w-6" />
          </div>
          <div className="text-3xl font-black tracking-tighter">GymBro</div>
        </div>

        <h1 className="text-2xl font-bold">Inserisci il codice</h1>
        {email ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Abbiamo inviato un codice di conferma a{" "}
            <span className="font-semibold text-foreground">{email}</span>. Inseriscilo per attivare
            l'account.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Inserisci l'email usata per registrarti: ti invieremo di nuovo il codice di conferma.
          </p>
        )}

        <div className="mt-8 space-y-6">
          {!email && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  placeholder="tu@example.com"
                  className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none transition focus:border-foreground"
                />
              </div>
              <button
                type="submit"
                disabled={resending}
                className="no-tap-highlight flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
              >
                {resending ? "Invio..." : "Invia codice"}
              </button>
            </form>
          )}

          <div className="flex justify-center">
            <InputOTP
              maxLength={OTP_LENGTH}
              value={code}
              onChange={(v) => setCode(v.replace(/\D/g, ""))}
              disabled={!email}
              autoFocus
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
            disabled={!email || verifying || code.length < OTP_LENGTH}
            className="no-tap-highlight flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {verifying ? "Verifica..." : "Conferma"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={!email || resending}
            className="block w-full text-center text-xs font-semibold text-muted-foreground"
          >
            {resending ? "Invio..." : "Non hai ricevuto il codice? Inviane un altro"}
          </button>

          <button
            type="button"
            onClick={() => navigate({ to: "/auth" })}
            className="flex w-full items-center justify-center gap-1 text-sm font-semibold text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Torna al login
          </button>
        </div>
      </div>
    </div>
  );
}
