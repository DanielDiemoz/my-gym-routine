import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, KeyRound, Timer, ShieldX, AlertCircle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { OTP_LENGTH } from "@/lib/otp";
import { useLanguage } from "@/lib/i18n";
import { notifyNewUser } from "@/server-functions/notify-telegram";

export const Route = createFileRoute("/auth/verify")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { email: string } => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      throw redirect({ to: profile?.role === "admin" ? "/admin" : "/app" });
    }
  },
  component: VerifyPage,
});

function getEmailVerificationUrl(email: string) {
  const url = new URL("/auth/verify", window.location.origin);
  url.searchParams.set("email", email);
  return url.toString();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ── SessionStorage Helper Functions ──────────────────────────────────────────
const getSavedCooldown = (): number => {
  if (typeof window === "undefined") return 0;
  const saved = sessionStorage.getItem("gymbro_otp_resend_time");
  if (!saved) return 0;
  const diff = Math.floor((new Date(saved).getTime() + 60000 - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
};

const getSavedResendCount = (): number => {
  if (typeof window === "undefined") return 0;
  const count = sessionStorage.getItem("gymbro_otp_resend_count");
  return count ? parseInt(count, 10) : 0;
};

const getSavedFailedAttempts = (): number => {
  if (typeof window === "undefined") return 0;
  const count = sessionStorage.getItem("gymbro_otp_failed_attempts");
  return count ? parseInt(count, 10) : 0;
};

const getSavedLockoutCooldown = (): number => {
  if (typeof window === "undefined") return 0;
  const saved = sessionStorage.getItem("gymbro_otp_lockout_time");
  if (!saved) return 0;
  const diff = Math.floor((new Date(saved).getTime() + 60000 - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
};

function VerifyPage() {
  const { email: searchEmail } = Route.useSearch();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [email, setEmail] = useState(() => normalizeEmail(searchEmail));
  const [emailInput, setEmailInput] = useState(() => normalizeEmail(searchEmail));
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  // Cooldown timers and limit counts
  const [cooldown, setCooldown] = useState(getSavedCooldown);
  const [resendCount, setResendCount] = useState(getSavedResendCount);
  const [failedAttempts, setFailedAttempts] = useState(getSavedFailedAttempts);
  const [lockoutTimer, setLockoutTimer] = useState(getSavedLockoutCooldown);

  // Link validation checking state
  const [checkingLink, setCheckingLink] = useState(true);

  // Cooldown interval effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Lockout interval effect
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          sessionStorage.removeItem("gymbro_otp_lockout_time");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Handle URL confirmation links if clicked
  useEffect(() => {
    let cancelled = false;

    function getAuthParam(name: string) {
      if (typeof window === "undefined") return null;
      const queryValue = new URLSearchParams(window.location.search).get(name);
      if (queryValue) return queryValue;
      return new URLSearchParams(window.location.hash.replace(/^#/, "")).get(name);
    }

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
          toast.error(t("Link di conferma non valido o scaduto.", "Confirmation link invalid or expired."));
          setCheckingLink(false);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        toast.success(t("Email confermata! Benvenuto su GymBro.", "Email confirmed! Welcome to GymBro."));
        navigate({ to: "/app" });
        return;
      }

      setCheckingLink(false);
    }

    completeLinkSignIn();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleVerify() {
    if (!email) {
      toast.error(t("Inserisci prima la tua email.", "Enter your email first."));
      return;
    }
    if (code.length < OTP_LENGTH) return;

    if (lockoutTimer > 0) {
      toast.error(t(`Troppi tentativi falliti. Riprova tra ${lockoutTimer} secondi.`, `Too many failed attempts. Try again in ${lockoutTimer} seconds.`));
      return;
    }

    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });

      if (error) {
        throw error;
      }

      // Clear session rate-limiting variables on success
      sessionStorage.removeItem("gymbro_otp_failed_attempts");
      sessionStorage.removeItem("gymbro_otp_resend_count");
      sessionStorage.removeItem("gymbro_otp_resend_time");
      sessionStorage.removeItem("gymbro_otp_lockout_time");

      toast.success(t("Email confermata! Benvenuto.", "Email confirmed! Welcome."));

      const { data: userData } = await supabase.auth.getUser();
      notifyNewUser({
        data: {
          email,
          userId: userData.user?.id || "N/A",
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          screen: `${window.screen.width}x${window.screen.height}`,
          referrer: document.referrer,
        },
      }).catch((err) => {
        console.error("Telegram notification failed:", err);
      });

      navigate({ to: "/app" });
    } catch (err) {
      console.error("Verification error:", err);
      setCode(""); // Clear the input field for security

      // Increment failed attempts
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      sessionStorage.setItem("gymbro_otp_failed_attempts", nextFailed.toString());

      if (nextFailed >= 5) {
        // Exceeded maximum attempts, trigger 60s lockout
        const lockoutEnd = new Date(Date.now() + 60000).toISOString();
        sessionStorage.setItem("gymbro_otp_lockout_time", lockoutEnd);
        setLockoutTimer(60);
        setFailedAttempts(0);
        sessionStorage.setItem("gymbro_otp_failed_attempts", "0");
        toast.error(t("Troppi tentativi errati. Account temporaneamente bloccato per 60 secondi.", "Too many wrong attempts. Account temporarily locked for 60 seconds."));
      } else {
        toast.error(t(`Codice errato. Rimangono ${5 - nextFailed} tentativi.`, `Wrong code. ${5 - nextFailed} attempts remaining.`));
      }
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!email) {
      toast.error(t("Inserisci prima la tua email.", "Enter your email first."));
      return;
    }

    if (resendCount >= 3) {
      toast.error(t("Limite massimo di richieste OTP raggiunto per questa sessione.", "Maximum OTP requests reached for this session."));
      return;
    }

    if (cooldown > 0) {
      toast.error(t(`Attendi altri ${cooldown} secondi prima di richiedere un nuovo codice.`, `Wait ${cooldown} more seconds before requesting a new code.`));
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: getEmailVerificationUrl(email) },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already confirmed") || msg.includes("already verified")) {
          toast.info(t("Email già confermata. Accedi dal login.", "Email already confirmed. Log in."));
          navigate({ to: "/auth" });
          return;
        }
        throw error;
      }

      // Update cooldown state and storage
      const nowStr = new Date().toISOString();
      sessionStorage.setItem("gymbro_otp_resend_time", nowStr);
      setCooldown(60);

      // Increment resend count
      const nextCount = resendCount + 1;
      setResendCount(nextCount);
      sessionStorage.setItem("gymbro_otp_resend_count", nextCount.toString());

      toast.success(t("Codice inviato di nuovo.", "Code sent again."));
    } catch (err) {
      console.error("Resend OTP error:", err);
      toast.error(t("Impossibile inviare il codice. Riprova più tardi.", "Unable to send the code. Try again later."));
    } finally {
      setResending(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = normalizeEmail(emailInput);
    if (!isValidEmail(nextEmail)) {
      toast.error(t("Inserisci un'email valida.", "Enter a valid email."));
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: nextEmail,
        options: { emailRedirectTo: getEmailVerificationUrl(nextEmail) },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already confirmed")) {
          toast.info(t("Email già confermata. Accedi dal login.", "Email already confirmed. Log in."));
          navigate({ to: "/auth" });
          return;
        }
        throw error;
      }

      setEmail(nextEmail);
      setEmailInput(nextEmail);
      navigate({ to: "/auth/verify", search: { email: nextEmail }, replace: true });
      toast.success(t("Codice di conferma inviato alla tua email!", "Confirmation code sent to your email!"));

      // Start cooldown timer
      const nowStr = new Date().toISOString();
      sessionStorage.setItem("gymbro_otp_resend_time", nowStr);
      setCooldown(60);
    } catch (err) {
      console.error("Email submission error:", err);
      toast.error(t("Impossibile inviare il codice. Riprova più tardi.", "Unable to send the code. Try again later."));
    } finally {
      setResending(false);
    }
  }

  function handleModifyEmail() {
    setEmail("");
    navigate({ to: "/auth/verify", search: { email: "" }, replace: true });
  }

  if (checkingLink) {
    return (
      <div className="w-full max-w-md mx-auto text-center space-y-4 py-8 animate-in fade-in duration-300">
        <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground font-medium">{t("Verifica in corso...", "Verifying...")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        {lockoutTimer > 0 ? (
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <ShieldX className="h-6 w-6 text-destructive animate-pulse" />
          </div>
        ) : (
          <div className="mb-4 flex justify-center overflow-hidden">
            <div className="relative h-16 w-24">
              <svg viewBox="0 0 96 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                <g style={{ animation: "paperPlaneFly 2.5s cubic-bezier(0.22,1,0.36,1) infinite" }}>
                  <path d="M8 32 L88 8 L56 32 L88 56 Z" className="fill-primary" opacity="0.9" />
                  <path d="M56 32 L88 8 L72 32 L88 56 Z" className="fill-primary/50" />
                  <circle cx="6" cy="32" r="2" className="fill-primary/25" style={{ animation: "trailFade 2.5s ease-out infinite" }} />
                  <circle cx="0" cy="32" r="1.5" className="fill-primary/15" style={{ animation: "trailFade 2.5s ease-out 0.15s infinite" }} />
                </g>
              </svg>
              <style>{`
                @keyframes paperPlaneFly {
                  0% { transform: translateX(60px) translateY(8px) rotate(8deg); opacity: 0; }
                  20% { transform: translateX(0) translateY(0) rotate(0deg); opacity: 1; }
                  60% { transform: translateX(0) translateY(0) rotate(0deg); opacity: 1; }
                  75% { transform: translateX(0) translateY(0) rotate(0deg); opacity: 0; }
                  100% { transform: translateX(60px) translateY(8px) rotate(8deg); opacity: 0; }
                }
                @keyframes trailFade {
                  0% { opacity: 0.4; transform: translateX(-4px); }
                  100% { opacity: 0; transform: translateX(-12px); }
                }
              `}</style>
            </div>
          </div>
        )}
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {lockoutTimer > 0 ? t("Account Bloccato", "Account Locked") : t("Verifica il tuo account", "Verify your account")}
          </h1>
          {email ? (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("Inserisci il codice OTP di", "Enter the")} {OTP_LENGTH} {t("cifre inviato a:", "digit OTP code sent to:")}
              </p>
              <p className="font-semibold text-foreground break-all">{email}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("Inserisci l'email per inviare un nuovo codice di verifica.", "Enter the email to send a new verification code.")}
            </p>
          )}
      </div>

      {lockoutTimer > 0 && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3 items-center animate-in zoom-in-95 duration-200">
          <Timer className="h-5 w-5 text-destructive shrink-0 animate-bounce" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-destructive">{t("Troppi tentativi falliti", "Too many failed attempts")}</p>
            <p className="text-xs text-muted-foreground">
              {t("Potrai inserire il codice nuovamente tra", "You can enter the code again in")} <span className="font-bold text-foreground">{lockoutTimer}</span> {t("secondi.", "seconds.")}
            </p>
          </div>
        </div>
      )}

      {resendCount >= 3 && (
        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4 flex gap-3 items-center animate-in zoom-in-95 duration-200">
          <AlertCircle className="h-5 w-5 text-warning shrink-0" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-warning">{t("Richieste esaurite", "Requests exhausted")}</p>
            <p className="text-xs text-muted-foreground">
              {t("Hai raggiunto il limite di invii OTP. Per riprovare, riavvia la sessione o contatta il supporto.", "You reached the OTP send limit. To retry, restart the session or contact support.")}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {!email ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("Email", "Email")}
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 pointer-events-none h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  autoComplete="email"
                  value={emailInput}
                  onChange={(event) => setEmailInput(event.target.value)}
                  placeholder="tu@esempio.it"
                  className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-4 text-base outline-none transition focus:border-foreground focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={resending}
              className="no-tap-highlight flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {resending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                t("Invia codice", "Send code")
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={OTP_LENGTH}
                value={code}
                onChange={(v) => setCode(v.replace(/\D/g, ""))}
                disabled={lockoutTimer > 0 || verifying}
                autoFocus
              >
                <InputOTPGroup className="gap-1.5">
                  {Array.from({ length: OTP_LENGTH }, (_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-12 w-9 rounded-xl border border-border text-base font-bold shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <button
              type="button"
              onClick={handleVerify}
              disabled={code.length < OTP_LENGTH || verifying || lockoutTimer > 0}
              className="no-tap-highlight flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {verifying ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                t("Conferma Codice", "Confirm Code")
              )}
            </button>

            <div className="flex flex-col gap-3 items-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0 || resendCount >= 3}
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
                {cooldown > 0
                  ? t(`Attendi ${cooldown}s prima di reinviare`, `Wait ${cooldown}s before resending`)
                  : resendCount >= 3
                    ? t("Limite invii OTP raggiunto", "OTP send limit reached")
                    : t("Non hai ricevuto il codice? Reinvia", "Didn't get the code? Resend")}
              </button>

              <button
                type="button"
                onClick={handleModifyEmail}
                className="text-xs font-semibold text-primary underline underline-offset-4 hover:text-primary/80 transition"
              >
                {t("Hai sbagliato email? Modificala qui", "Wrong email? Change it here")}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate({ to: "/auth" })}
          className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition mt-4"
        >
          <ArrowLeft className="h-4 w-4" /> {t("Torna alla login", "Back to login")}
        </button>
      </div>
    </div>
  );
}
