import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account creato. Benvenuto!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Errore";
      toast.error(msg.includes("Invalid login") ? "Email o password errati" : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container-app flex flex-1 flex-col justify-center py-16">
        <div className="mb-12">
          <div className="text-4xl font-black tracking-tighter">GymBro</div>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "login" ? "Bentornato. Continua dove ti sei fermato." : "Crea un account e inizia ad allenarti."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none transition focus:border-foreground"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none transition focus:border-foreground"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="no-tap-highlight mt-4 flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "..." : mode === "login" ? "Accedi" : "Crea account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="no-tap-highlight mt-6 text-center text-sm text-muted-foreground"
        >
          {mode === "login" ? (
            <>Non hai un account? <span className="font-semibold text-foreground">Registrati</span></>
          ) : (
            <>Hai già un account? <span className="font-semibold text-foreground">Accedi</span></>
          )}
        </button>
      </div>
    </div>
  );
}
