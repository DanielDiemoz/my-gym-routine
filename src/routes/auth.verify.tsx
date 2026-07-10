import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/auth/verify")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { email: string } => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
    if (!search.email) throw redirect({ to: "/auth" });
  },
  component: VerifyPage,
});

function VerifyPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function handleVerify() {
    if (code.length < 6) return;
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
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Codice inviato di nuovo.");
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
        <p className="mt-3 text-sm text-muted-foreground">
          Abbiamo inviato un codice di conferma a{" "}
          <span className="font-semibold text-foreground">{email}</span>. Inseriscilo per attivare
          l'account.
        </p>

        <div className="mt-8 space-y-6">
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
