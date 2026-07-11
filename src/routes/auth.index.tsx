import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, ShieldAlert, ArrowRight, UserPlus, LogIn, AlertCircle } from "lucide-react";

function getEmailVerificationUrl(email: string) {
  const url = new URL("/auth/verify", window.location.origin);
  url.searchParams.set("email", email);
  return url.toString();
}

export const Route = createFileRoute("/auth/")({
  ssr: false,
  component: AuthIndexPage,
});

// ── Schemas ────────────────────────────────────────────────────────────────
const usernameLoginSchema = z.object({
  username: z.string().trim().min(2, "Minimo 2 caratteri"),
  password: z.string().min(6, "Minimo 6 caratteri"),
});

const loginSchema = z.object({
  email: z.string().trim().email("Inserisci un'email valida"),
  password: z.string().min(1, "Password richiesta"),
});

const signupSchema = z
  .object({
    email: z.string().trim().email("Inserisci un'email valida"),
    password: z
      .string()
      .min(6, "La password deve essere di almeno 6 caratteri")
      .regex(/[0-9]/, "Deve contenere almeno un numero")
      .regex(/[^A-Za-z0-9]/, "Deve contenere almeno un carattere speciale"),
    confirmPassword: z.string().min(1, "Conferma la password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

const forgotSchema = z.object({
  email: z.string().trim().email("Inserisci un'email valida"),
});

type UsernameLoginForm = z.infer<typeof usernameLoginSchema>;
type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;

type AuthTab = "username" | "email";
type AuthMode = "login" | "signup";

function AuthIndexPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AuthTab>("email");
  const [mode, setMode] = useState<AuthMode>("login");
  const [forgot, setForgot] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendingUnverified, setResendingUnverified] = useState(false);

  // Reset states when changing tab or mode
  useEffect(() => {
    setForgot(false);
    setUnverifiedEmail(null);
  }, [tab, mode]);

  function onLoginSuccess() {
    navigate({ to: "/" });
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
      
      toast.success("Codice di conferma inviato nuovamente.");
      navigate({ to: "/auth/verify", search: { email: unverifiedEmail } });
    } catch (err) {
      console.error("Resend error:", err);
      toast.error("Impossibile inviare il codice. Riprova più tardi.");
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
            ? "Recupera la tua password inserendo la mail."
            : mode === "login"
              ? "Bentornato. Accedi per continuare i tuoi allenamenti."
              : "Crea un account per iniziare a tracciare le tue schede."}
        </p>
      </div>

      {unverifiedEmail && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-3 animate-in zoom-in-95 duration-200">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-destructive">Account non verificato</h4>
              <p className="text-xs text-muted-foreground">
                Devi confermare la tua email con il codice OTP per poter accedere.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setUnverifiedEmail(null)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-muted transition"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={resendingUnverified}
              onClick={handleResendUnverified}
              className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 active:scale-95 transition disabled:opacity-50"
            >
              {resendingUnverified ? "Invio..." : "Reinvia codice OTP"}
            </button>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as AuthTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/50 p-1">
          <TabsTrigger value="email" className="rounded-xl py-2.5 transition-all text-sm font-semibold">
            Email
          </TabsTrigger>
          <TabsTrigger value="username" className="rounded-xl py-2.5 transition-all text-sm font-semibold">
            Username (legacy)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="username" className="mt-6 space-y-4">
          <UsernameForm onSuccess={onLoginSuccess} />
        </TabsContent>

        <TabsContent value="email" className="mt-6 space-y-4">
          {forgot ? (
            <ForgotForm onBack={() => setForgot(false)} />
          ) : mode === "login" ? (
            <LoginForm
              onSuccess={onLoginSuccess}
              onForgot={() => setForgot(true)}
              onUnverified={(email) => setUnverifiedEmail(email)}
            />
          ) : (
            <SignupForm
              onSuccess={() => setMode("login")}
            />
          )}
        </TabsContent>
      </Tabs>

      {!forgot && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              if (tab === "username") {
                setTab("email");
                setMode("signup");
              } else {
                setMode(mode === "login" ? "signup" : "login");
              }
            }}
            className="no-tap-highlight text-sm text-muted-foreground hover:text-foreground transition font-medium"
          >
            {tab === "username" ? (
              <>
                Non hai un account?{" "}
                <span className="font-semibold text-primary underline underline-offset-4">
                  Registrati con email
                </span>
              </>
            ) : mode === "login" ? (
              <>
                Non hai un account?{" "}
                <span className="font-semibold text-primary underline underline-offset-4">
                  Registrati
                </span>
              </>
            ) : (
              <>
                Hai già un account?{" "}
                <span className="font-semibold text-primary underline underline-offset-4">
                  Accedi
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Legacy Username Form ────────────────────────────────────────────────────
function UsernameForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UsernameLoginForm>({
    resolver: zodResolver(usernameLoginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: UsernameLoginForm) {
    try {
      const virtualEmail = `${values.username.trim().toLowerCase()}@gymbro.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: values.password,
      });
      if (error) throw error;
      toast.success("Accesso eseguito!");
      onSuccess();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg.includes("Invalid login") ? "Username o password errati" : "Errore durante l'accesso.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-2xl bg-muted/40 border border-border px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">Modalità legacy</p>
        <p>Solo per account creati prima della migrazione email. Per creare un nuovo account usa il tab Email.</p>
      </div>

      <FormField
        label="Username"
        type="text"
        id="legacy-username"
        autoComplete="username"
        placeholder="Il tuo username"
        registration={register("username")}
        error={errors.username?.message}
        icon={<UserPlus className="h-5 w-5 text-muted-foreground" />}
      />
      <FormField
        label="Password"
        type="password"
        id="legacy-password"
        autoComplete="current-password"
        placeholder="••••••••"
        registration={register("password")}
        error={errors.password?.message}
        icon={<Lock className="h-5 w-5 text-muted-foreground" />}
      />

      <SubmitButton loading={isSubmitting}>Accedi</SubmitButton>
    </form>
  );
}

// ── Email Login Form ────────────────────────────────────────────────────────
interface LoginFormProps {
  onSuccess: () => void;
  onForgot: () => void;
  onUnverified: (email: string) => void;
}

function LoginForm({ onSuccess, onForgot, onUnverified }: LoginFormProps) {
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
          toast.error("Email non verificata. Conferma il tuo account prima di accedere.");
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
        toast.error("Troppi tentativi. Riprova più tardi.");
        return;
      }
      
      // Generic message to prevent email harvesting
      toast.error("Email o password non validi.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Email"
        type="email"
        id="login-email"
        autoComplete="email"
        placeholder="tu@esempio.it"
        registration={register("email")}
        error={errors.email?.message}
        icon={<Mail className="h-5 w-5 text-muted-foreground" />}
      />
      <FormField
        label="Password"
        type="password"
        id="login-password"
        autoComplete="current-password"
        placeholder="••••••••"
        registration={register("password")}
        error={errors.password?.message}
        icon={<Lock className="h-5 w-5 text-muted-foreground" />}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onForgot}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground transition underline underline-offset-2"
        >
          Password dimenticata?
        </button>
      </div>

      <SubmitButton loading={isSubmitting}>Accedi</SubmitButton>
    </form>
  );
}

// ── Email Signup Form ───────────────────────────────────────────────────────
interface SignupFormProps {
  onSuccess: () => void;
}

function SignupForm({ onSuccess }: SignupFormProps) {
  const navigate = useNavigate();
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
          toast.error("L'email è già in uso. Accedi o recupera la password.");
          return;
        }
        throw error;
      }

      // Check if identities is empty array (meaning email is already registered and verified in Supabase)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast.error("L'email è già in uso. Accedi o recupera la password.");
        return;
      }

      if (!data.session) {
        toast.success("Codice di conferma inviato alla tua email!");
        navigate({ to: "/auth/verify", search: { email } });
      } else {
        toast.success("Registrazione completata!");
        navigate({ to: "/" });
      }
    } catch (err) {
      console.error("Signup error:", err);
      // Suppress detailed technical messages to keep error generic and log silently
      toast.error("Impossibile completare la registrazione. Riprova più tardi.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Email"
        type="email"
        id="signup-email"
        autoComplete="email"
        placeholder="tu@esempio.it"
        registration={register("email")}
        error={errors.email?.message}
        icon={<Mail className="h-5 w-5 text-muted-foreground" />}
      />
      <FormField
        label="Password"
        type="password"
        id="signup-password"
        autoComplete="new-password"
        placeholder="••••••••"
        registration={register("password")}
        error={errors.password?.message}
        icon={<Lock className="h-5 w-5 text-muted-foreground" />}
      />

      {/* Real-time password feedback */}
      {passwordValue && (
        <div className="rounded-xl bg-muted/30 border border-border p-3 space-y-1.5 text-xs text-muted-foreground animate-in slide-in-from-top-1 duration-200">
          <p className="font-semibold text-foreground">Requisiti password:</p>
          <div className="grid grid-cols-1 gap-1">
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${hasMinLength ? "bg-success" : "bg-muted-foreground"}`} />
              <span className={hasMinLength ? "text-foreground font-medium" : ""}>Almeno 6 caratteri</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${hasNumber ? "bg-success" : "bg-muted-foreground"}`} />
              <span className={hasNumber ? "text-foreground font-medium" : ""}>Almeno un numero</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${hasSpecial ? "bg-success" : "bg-muted-foreground"}`} />
              <span className={hasSpecial ? "text-foreground font-medium" : ""}>Almeno un carattere speciale</span>
            </div>
          </div>
        </div>
      )}

      <FormField
        label="Conferma Password"
        type="password"
        id="signup-confirm-password"
        autoComplete="new-password"
        placeholder="••••••••"
        registration={register("confirmPassword")}
        error={errors.confirmPassword?.message}
        icon={<Lock className="h-5 w-5 text-muted-foreground" />}
      />

      <SubmitButton loading={isSubmitting}>Registrati</SubmitButton>
    </form>
  );
}

// ── Forgot Password Form ────────────────────────────────────────────────────
function ForgotForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
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
      toast.success("Codice di reset inviato alla tua email.");
      navigate({ to: "/auth/reset", search: { email: values.email } });
    } catch (err) {
      console.error(err);
      toast.error("Errore nell'invio del codice di reset.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Email"
        type="email"
        id="forgot-email"
        autoComplete="email"
        placeholder="tu@esempio.it"
        registration={register("email")}
        error={errors.email?.message}
        icon={<Mail className="h-5 w-5 text-muted-foreground" />}
      />

      <SubmitButton loading={isSubmitting}>Invia codice di reset</SubmitButton>

      <button
        type="button"
        onClick={onBack}
        className="block w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground transition underline underline-offset-2"
      >
        Torna al login
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
            icon ? "pl-12 pr-4" : "px-4"
          } ${error ? "border-destructive/50 focus:border-destructive focus:ring-destructive" : "border-border"}`}
        />
      </div>
      {error && <p className="text-xs font-semibold text-destructive animate-in fade-in duration-200">{error}</p>}
    </div>
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
