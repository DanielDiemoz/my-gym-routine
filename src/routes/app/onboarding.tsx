import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { markOnboardingComplete } from "@/lib/onboarding-flag";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/app/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user, profile } = Route.useRouteContext();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  async function save() {
    if (!name.trim()) {
      toast.error(t("Inserisci il tuo nome", "Enter your name"));
      return;
    }
    setSaving(true);
    try {
      const { error: upsertError } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: name.trim(),
        onboarded: true,
      });
      if (upsertError) {
        toast.error(upsertError.message);
        return;
      }
      markOnboardingComplete();
      await navigate({ to: "/app" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("Qualcosa è andato storto", "Something went wrong"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-app flex min-h-screen flex-col py-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("Benvenuto", "Welcome")}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          {t("Configura il tuo profilo", "Set up your profile")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Inserisci il tuo nome per iniziare.", "Enter your name to get started.")}
        </p>
      </div>

      <div className="mt-10 space-y-6">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Come ti chiami", "What's your name")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none transition focus:border-foreground"
            placeholder={t("Il tuo nome", "Your name")}
            autoFocus
          />
        </div>
      </div>

      <div className="mt-auto pt-12">
        <button
          onClick={save}
          disabled={saving}
          className="no-tap-highlight w-full rounded-full bg-primary py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "..." : t("Inizia", "Start")}
        </button>
      </div>
    </div>
  );
}
