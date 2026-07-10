import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

// ── Schemas ────────────────────────────────────────────────────────────────
const usernameLoginSchema = z.object({
  username: z.string().trim().min(2, "Minimo 2 caratteri"),
  password: z.string().min(6, "Minimo 6 caratteri"),
});
const emailSchema = z.object({
  email: z.string().trim().email("Email non valida"),
  password: z.string().min(6, "Minimo 6 caratteri"),
});
const forgotSchema = z.object({
  email: z.string().trim().email("Email non valida"),
});

type UserLoginForm = z.infer<typeof usernameLoginSchema>;
type EmailForm = z.infer<typeof emailSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;

type AuthTab = "username" | "email";
type AuthMode = "login" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AuthTab>("email");
  const [mode, setMode] = useState<AuthMode>("login");
  const [forgot, setForgot] = useState(false);

  // Reset forgot quando si cambia tab.
  useEffect(() => {
    setForgot(false);
  }, [tab]);

  function onLoginSuccess() {
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container-app flex flex-1 flex-col justify-center py-16">
        <div className="mb-8">
          <div className="text-4xl font-black tracking-tighter">GymBro</div>
          <p className="mt-3 text-sm text-muted-foreground">
            {forgot
              ? "Recupera la tua password."
              : mode === "login"
                ? "Bentornato. Continua dove ti sei fermato."
                : "Crea un account e inizia ad allenarti."}
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as AuthTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="username">Username (legacy)</TabsTrigger>
          </TabsList>

          <TabsContent value="username" className="mt-6">
            <UsernameForm onSuccess={onLoginSuccess} />
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            {forgot ? (
              <ForgotForm onBack={() => setForgot(false)} />
            ) : (
              <EmailForm
                mode={mode}
                setMode={setMode}
                onSuccess={onLoginSuccess}
                onForgot={() => setForgot(true)}
              />
            )}
          </TabsContent>
        </Tabs>

        {!forgot && (
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
            className="no-tap-highlight mt-6 text-center text-sm text-muted-foreground"
          >
            {tab === "username" ? (
              <>
                Non hai un account?{" "}
                <span className="font-semibold text-foreground">Registrati con email</span>
              </>
            ) : mode === "login" ? (
              <>
                Non hai un account?{" "}
                <span className="font-semibold text-foreground">Registrati</span>
              </>
            ) : (
              <>
                Hai già un account? <span className="font-semibold text-foreground">Accedi</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Username (legacy @gymbro.local) ────────────────────────────────────────
function UsernameForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserLoginForm>({
    resolver: zodResolver(usernameLoginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: UserLoginForm) {
    try {
      const virtualEmail = `${values.username.trim().toLowerCase()}@gymbro.local`;
      const { error } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: values.password,
      });
      if (error) throw error;
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      toast.error(msg.includes("Invalid login") ? "Username o password errati" : msg);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        Modalità legacy: solo per account creati prima della migrazione email. Per creare un nuovo
        account usa il tab Email.
      </p>

      <FormField
        label="Username"
        type="text"
        autoComplete="username"
        placeholder="Il tuo username"
        registration={register("username")}
        error={errors.username?.message}
      />
      <FormField
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        registration={register("password")}
        error={errors.password?.message}
      />

      <SubmitButton loading={isSubmitting}>Accedi</SubmitButton>
    </form>
  );
}

// ── Email (real auth) ───────────────────────────────────────────────────────
function EmailForm({
  mode,
  setMode,
  onSuccess,
  onForgot,
}: {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  onSuccess: () => void;
  onForgot: () => void;
}) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: EmailForm) {
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // Se l'email non è già confermata, vai alla schermata di inserimento
        // codice (OTP) invece di chiedere di controllare la mail.
        if (!data.user?.email_confirmed_at) {
          if (data.session) await supabase.auth.signOut();
          toast.success("Codice di conferma inviato alla tua email.");
          navigate({ to: "/auth/verify", search: { email: values.email } });
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
      }
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      toast.error(msg.includes("Invalid login") ? "Email o password errati" : msg);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="tu@example.com"
        registration={register("email")}
        error={errors.email?.message}
      />
      <FormField
        label="Password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        placeholder="••••••••"
        registration={register("password")}
        error={errors.password?.message}
      />

      {mode === "login" && (
        <button
          type="button"
          onClick={onForgot}
          className="block text-left text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Password dimenticata?
        </button>
      )}

      <SubmitButton loading={isSubmitting}>
        {mode === "login" ? "Accedi" : "Crea account"}
      </SubmitButton>
    </form>
  );
}

// ── Forgot password ─────────────────────────────────────────────────────────
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
      toast.error(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="tu@example.com"
        registration={register("email")}
        error={errors.email?.message}
      />

      <SubmitButton loading={isSubmitting}>Invia codice di reset</SubmitButton>

      <button
        type="button"
        onClick={onBack}
        className="block w-full text-center text-xs text-muted-foreground"
      >
        Torna al login
      </button>
    </form>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function FormField({
  label,
  type,
  autoComplete,
  placeholder,
  registration,
  error,
}: {
  label: string;
  type: string;
  autoComplete?: string;
  placeholder?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registration: any;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        {...registration}
        className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none transition focus:border-foreground"
      />
      {error && <p className="mt-1.5 text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="no-tap-highlight mt-4 flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
    >
      {loading ? "..." : children}
    </button>
  );
}
