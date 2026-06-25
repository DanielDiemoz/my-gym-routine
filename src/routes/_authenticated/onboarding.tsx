import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { WeightUnit } from "@/hooks/useWeightUnit";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user, profile } = Route.useRouteContext();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unit, setUnit] = useState<WeightUnit>("kg");

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore upload");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Inserisci il tuo nome");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: name.trim(),
          avatar_url: avatarUrl || null,
          onboarded: true,
          weight_unit: unit,
        });
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      await navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Qualcosa è andato storto");
      setSaving(false);
    }
  }

  return (
    <div className="container-app flex min-h-screen flex-col py-12">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Benvenuto</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Configura il tuo profilo</h1>
        <p className="mt-2 text-sm text-muted-foreground">Solo due cose per iniziare.</p>
      </div>

      <div className="mt-12 flex flex-col items-center">
        <label className="relative h-28 w-28 cursor-pointer overflow-hidden rounded-full border border-border bg-muted">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Camera className="h-7 w-7" />
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} disabled={uploading} />
        </label>
        <p className="mt-3 text-xs text-muted-foreground">{uploading ? "Caricamento..." : "Foto profilo (opzionale)"}</p>
      </div>

      <div className="mt-10">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Come ti chiami</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none transition focus:border-foreground"
          placeholder="Il tuo nome"
          autoFocus
        />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Unità di misura</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Come vuoi registrare i pesi?
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-semibold ${unit === "kg" ? "text-foreground" : "text-muted-foreground"}`}
            >
              kg
            </span>
            <Switch
              checked={unit === "lbs"}
              onCheckedChange={(v) => setUnit(v ? "lbs" : "kg")}
              aria-label="Cambia unità di misura"
            />
            <span
              className={`text-xs font-semibold ${unit === "lbs" ? "text-foreground" : "text-muted-foreground"}`}
            >
              lbs
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-12">
        <button
          onClick={save}
          disabled={saving}
          className="no-tap-highlight w-full rounded-full bg-primary py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "..." : "Inizia"}
        </button>
      </div>
    </div>
  );
}
