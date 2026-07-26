import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight, LogIn, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useLanguage, tx } from "@/lib/i18n";

function getEmailVerificationUrl(email: string) {
  const url = new URL("/auth/verify", window.location.origin);
  url.searchParams.set("email", email);
  return url.toString();
}

export const Route = createFileRoute("/auth/")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { mode?: string } => ({
    mode: typeof search.mode === "string" ? search.mode : undefined,
  }),
  component: AuthIndexPage,
});

// ── Schemas ────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().trim().email(tx("Inserisci un'email valida", "Enter a valid email")),
  password: z.string().min(1, tx("Password richiesta", "Password required")),
});

const signupSchema = z
  .object({
    email: z.string().trim().email(tx("Inserisci un'email valida", "Enter a valid email")),
    password: z
      .string()
      .min(6, tx("La password deve essere di almeno 6 caratteri", "Password must be at least 6 characters"))
      .regex(/[0-9]/, tx("Deve contenere almeno un numero", "Must contain at least one number"))
      .regex(/[^A-Za-z0-9]/, tx("Deve contenere almeno un carattere speciale", "Must contain at least one special character")),
    confirmPassword: z.string().min(1, tx("Conferma la password", "Confirm the password")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: tx("Le password non coincidono", "Passwords do not match"),
    path: ["confirmPassword"],
  });

const forgotSchema = z.object({
  email: z.string().trim().email(tx("Inserisci un'email valida", "Enter a valid email")),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;

type AuthMode = "login" | "signup";

function AuthIndexPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<AuthMode>(
    initialMode === "signup" ? "signup" : "login",
  );
  const [forgot, setForgot] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendingUnverified, setResendingUnverified] = useState(false);

  // Reset states when changing mode
  useEffect(() => {
    setForgot(false);
    setUnverifiedEmail(null);
  }, [mode]);

  function onLoginSuccess() {
    navigate({ to: "/app" });
  }

  async function handleResendUnverified() {
    if (!unverifiedEmail) return;
    setResendingUnverified(true);
    try {
      const emailRedirectTo = getEmailVerificationUrl(unverifiedEmail);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: unverifiedEmail,
        options: { emailRedirectTo },
      });
      if (error) throw error;
      
       toast.success(t("Codice di conferma inviato nuovamente.", "Confirmation code sent again."));
      navigate({ to: "/auth/verify", search: { email: unverifiedEmail } });
    } catch (err) {
      console.error("Resend error:", err);
      toast.error(t("Impossibile inviare il codice. Riprova più tardi.", "Unable to send the code. Try again later."));
    } finally {
      setResendingUnverified(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
          <LogIn className="h-6 w-6" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground bg-clip-text">
          GymBro
        </h1>
        <p className="text-sm text-muted-foreground">
          {forgot
            ? t("Recupera la tua password inserendo la mail.", "Recover your password by entering your email.")
            : mode === "login"
              ? t("Bentornato. Accedi per continuare i tuoi allenamenti.", "Welcome back. Log in to continue your workouts.")
              : t("Crea un account per iniziare a tracciare le tue schede.", "Create an account to start tracking your plans.")}
        </p>
      </div>

      {unverifiedEmail && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-3 animate-in zoom-in-95 duration-200">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-destructive">{t("Account non verificato", "Account not verified")}</h4>
              <p className="text-xs text-muted-foreground">
                {t("Devi confermare la tua email con il codice OTP per poter accedere.", "You must confirm your email with the OTP code to log in.")}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setUnverifiedEmail(null)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-muted transition"
            >
              {t("Annulla", "Cancel")}
            </button>
            <button
              type="button"
              disabled={resendingUnverified}
              onClick={handleResendUnverified}
              className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 active:scale-95 transition disabled:opacity-50"
            >
              {resendingUnverified ? t("Invio...", "Sending...") : t("Reinvia codice OTP", "Resend OTP code")}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {forgot ? (
          <ForgotForm onBack={() => setForgot(false)} />
        ) : mode === "login" ? (
          <LoginForm
            onSuccess={onLoginSuccess}
            onForgot={() => setForgot(true)}
            onUnverified={(email) => setUnverifiedEmail(email)}
          />
        ) : (
          <SignupForm onSuccess={() => setMode("login")} />
        )}
      </div>

      {!forgot && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="no-tap-highlight text-sm text-muted-foreground hover:text-foreground transition font-medium"
          >
            {mode === "login" ? (
              <>
                {t("Non hai un account?", "No account?")}{" "}
                <span className="font-semibold text-primary underline underline-offset-4">
                  {t("Registrati", "Sign up")}
                </span>
              </>
            ) : (
              <>
                {t("Hai già un account?", "Already have an account?")}{" "}
                <span className="font-semibold text-primary underline underline-offset-4">
                  {t("Accedi", "Log in")}
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Email Login Form ────────────────────────────────────────────────────────
interface LoginFormProps {
  onSuccess: () => void;
  onForgot: () => void;
  onUnverified: (email: string) => void;
}

function LoginForm({ onSuccess, onForgot, onUnverified }: LoginFormProps) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
    const email = values.email.trim().toLowerCase();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      });

      if (error) {
        // Handle unconfirmed email
        if (
          error.message.toLowerCase().includes("email not confirmed") ||
          (error.status === 400 && error.message.toLowerCase().includes("confirm"))
        ) {
          onUnverified(email);
          toast.error(t("Email non verificata. Conferma il tuo account prima di accedere.", "Email not verified. Confirm your account before logging in."));
          return;
        }
        throw error;
      }

      toast.success("Bentornato!");
      onSuccess();
    } catch (err) {
      console.error("Login error:", err);
      const errorMsg = err instanceof Error ? err.message : "";
      
      if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("rate limit")) {
        toast.error(t("Troppi tentativi. Riprova più tardi.", "Too many attempts. Try again later."));
        return;
      }
      
      // Generic message to prevent email harvesting
      toast.error(t("Email o password non validi.", "Invalid email or password."));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label={t("Email", "Email")}
        type="email"
        id="login-email"
        autoComplete="email"
        placeholder="tu@esempio.it"
        registration={register("email")}
        error={errors.email?.message}
        icon={<Mail className="h-5 w-5 text-muted-foreground" />}
      />
      <FormField
        label={t("Password", "Password")}
        type={showPassword ? "text" : "password"}
        id="login-password"
        autoComplete="current-password"
        placeholder="••••••••"
        registration={register("password")}
        error={errors.password?.message}
        icon={<Lock className="h-5 w-5 text-muted-foreground" />}
        trailing={<PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onForgot}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition underline underline-offset-2"
        >
          {t("Password dimenticata?", "Forgot password?")}
        </button>
      </div>

      <SubmitButton loading={isSubmitting}>{t("Accedi", "Log in")}</SubmitButton>
    </form>
  );
}

// ── Email Signup Form ───────────────────────────────────────────────────────
interface SignupFormProps {
  onSuccess: () => void;
}

function SignupForm({ onSuccess }: SignupFormProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password", "");

  // Password rules checks for real-time visual feedback
  const hasMinLength = passwordValue.length >= 6;
  const hasNumber = /[0-9]/.test(passwordValue);
  const hasSpecial = /[^A-Za-z0-9]/.test(passwordValue);

  async function onSubmit(values: SignupForm) {
    const email = values.email.trim().toLowerCase();
    try {
      const emailRedirectTo = getEmailVerificationUrl(email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: { emailRedirectTo },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already in use")
        ) {
          toast.error(t("L'email è già in uso. Accedi o recupera la password.", "Email already in use. Log in or recover your password."));
          return;
        }
        throw error;
      }

      // Check if identities is empty array (meaning email is already registered and verified in Supabase)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast.error(t("L'email è già in uso. Accedi o recupera la password.", "Email already in use. Log in or recover your password."));
        return;
      }

      if (!data.session) {
        toast.success(t("Codice di conferma inviato alla tua email!", "Confirmation code sent to your email!"));
        navigate({ to: "/auth/verify", search: { email } });
      } else {
        toast.success(t("Registrazione completata!", "Registration complete!"));
        navigate({ to: "/app" });
      }
    } catch (err) {
      console.error("Signup error:", err);
      // Suppress detailed technical messages to keep error generic and log silently
      toast.error(t("Impossibile completare la registrazione. Riprova più tardi.", "Unable to complete registration. Try again later."));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label={t("Email", "Email")}
        type="email"
        id="signup-email"
        autoComplete="email"
        placeholder="tu@esempio.it"
        registration={register("email")}
        error={errors.email?.message}
        icon={<Mail className="h-5 w-5 text-muted-foreground" />}
      />
      <FormField
        label={t("Password", "Password")}
        type={showPassword ? "text" : "password"}
        id="signup-password"
        autoComplete="new-password"
        placeholder="••••••••"
        registration={register("password")}
        error={errors.password?.message}
        icon={<Lock className="h-5 w-5 text-muted-foreground" />}
        trailing={<PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
      />

      {/* Real-time password feedback */}
      {passwordValue && (
        <div className="rounded-xl bg-muted/30 border border-border p-3 space-y-1.5 text-xs text-muted-foreground animate-in slide-in-from-top-1 duration-200">
          <p className="font-semibold text-foreground">{t("Requisiti password:", "Password requirements:")}</p>
          <div className="grid grid-cols-1 gap-1">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${hasMinLength ? "bg-success" : "bg-muted-foreground"}`} />
              <span className={hasMinLength ? "text-foreground font-medium" : ""}>{t("Almeno 6 caratteri", "At least 6 characters")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${hasNumber ? "bg-success" : "bg-muted-foreground"}`} />
              <span className={hasNumber ? "text-foreground font-medium" : ""}>{t("Almeno un numero", "At least one number")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${hasSpecial ? "bg-success" : "bg-muted-foreground"}`} />
              <span className={hasSpecial ? "text-foreground font-medium" : ""}>{t("Almeno un carattere speciale", "At least one special character")}</span>
            </div>
          </div>
        </div>
      )}

      <FormField
        label={t("Conferma Password", "Confirm Password")}
        type={showPassword ? "text" : "password"}
        id="signup-confirm-password"
        autoComplete="new-password"
        placeholder="••••••••"
        registration={register("confirmPassword")}
        error={errors.confirmPassword?.message}
        icon={<Lock className="h-5 w-5 text-muted-foreground" />}
        trailing={<PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
      />

      <SubmitButton loading={isSubmitting}>{t("Registrati", "Sign up")}</SubmitButton>
    </form>
  );
}

// ── Forgot Password Form ────────────────────────────────────────────────────
function ForgotForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotForm) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email);
      if (error) throw error;
      toast.success(t("Codice di reset inviato alla tua email.", "Reset code sent to your email."));
      navigate({ to: "/auth/reset", search: { email: values.email } });
    } catch (err) {
      console.error(err);
      toast.error(t("Errore nell'invio del codice di reset.", "Error sending reset code."));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label={t("Email", "Email")}
        type="email"
        id="forgot-email"
        autoComplete="email"
        placeholder="tu@esempio.it"
        registration={register("email")}
        error={errors.email?.message}
        icon={<Mail className="h-5 w-5 text-muted-foreground" />}
      />

      <SubmitButton loading={isSubmitting}>{t("Invia codice di reset", "Send reset code")}</SubmitButton>

      <button
        type="button"
        onClick={onBack}
        className="block w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground transition underline underline-offset-2"
      >
        {t("Torna al login", "Back to login")}
      </button>
    </form>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  type: string;
  id: string;
  autoComplete?: string;
  placeholder?: string;
  registration: any;
  error?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}

function FormField({
  label,
  type,
  id,
  autoComplete,
  placeholder,
  registration,
  error,
  icon,
  trailing,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && <div className="absolute left-4 pointer-events-none">{icon}</div>}
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          {...registration}
          className={`w-full rounded-2xl border bg-card py-4 text-base outline-none transition duration-200 focus:border-foreground focus:ring-1 focus:ring-foreground ${
            icon ? "pl-12" : "pl-4"
          } ${trailing ? "pr-12" : "pr-4"} ${
            error ? "border-destructive/50 focus:border-destructive focus:ring-destructive" : "border-border"
          }`}
        />
        {trailing && <div className="absolute right-4">{trailing}</div>}
      </div>
      {error && <p className="text-xs font-semibold text-destructive animate-in fade-in duration-200">{error}</p>}
    </div>
  );
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? t("Nascondi password", "Hide password") : t("Mostra password", "Show password")}
      className="no-tap-highlight text-muted-foreground hover:text-foreground transition"
    >
      {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="no-tap-highlight mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
    >
      {loading ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
      ) : (
        <>
          {children}
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
