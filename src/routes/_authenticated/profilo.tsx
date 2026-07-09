import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronDown, User, Mail, Plus, LogOut, Smartphone, Apple, CheckCircle2, Download, Scale } from "lucide-react";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profilo")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile } = Route.useRouteContext();
  const navigate = useNavigate();
  const [addingEmail, setAddingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const name = profile?.display_name || "Atleta";
  const apkUrl = "/apk/gymbro.apk";

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && (navigator as Record<string, unknown>).standalone === true),
    );
  }, []);

  async function handleAddEmail() {
    if (!newEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email aggiunta! Controlla la posta per verificarla.");
      setAddingEmail(false);
      setNewEmail("");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="container-app pt-6">
      <header className="mb-6">
        <Link
          to="/"
          className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" /> Dashboard
        </Link>
      </header>

      {/* Profile section */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold truncate">{name}</h1>
            {user.email ? (
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nessuna email</p>
            )}
          </div>
        </div>

        {user.email ? null : addingEmail ? (
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nuova@email.it"
              className="flex-1 rounded-full border border-border bg-muted px-4 py-2 text-sm outline-none focus:border-foreground"
            />
            <button
              onClick={handleAddEmail}
              disabled={saving || !newEmail.trim()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Salvataggio…" : "Salva"}
            </button>
            <button
              onClick={() => { setAddingEmail(false); setNewEmail(""); }}
              className="text-sm text-muted-foreground font-semibold"
            >
              Annulla
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingEmail(true)}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Aggiungi una email
          </button>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Peso corporeo</span>
            </div>
            {editingWeight ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-20 rounded-full border border-border bg-muted px-3 py-1.5 text-sm outline-none focus:border-foreground"
                  placeholder="70"
                  min={20}
                  max={500}
                  step={0.1}
                  autoFocus
                />
                <button
                  onClick={async () => {
                    const w = weightInput.trim() ? parseFloat(weightInput.trim()) : null;
                    if (w !== null && (w <= 0 || w >= 500)) {
                      toast.error("Inserisci un peso valido (1-500 kg)");
                      return;
                    }
                    setSavingWeight(true);
                    const { error } = await supabase
                      .from("profiles")
                      .update({ weight_kg: w })
                      .eq("id", user.id);
                    setSavingWeight(false);
                    if (error) {
                      toast.error(error.message);
                      return;
                    }
                    toast.success("Peso aggiornato");
                    setEditingWeight(false);
                  }}
                  disabled={savingWeight}
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {savingWeight ? "…" : "Salva"}
                </button>
                <button
                  onClick={() => { setEditingWeight(false); setWeightInput(""); }}
                  className="text-xs text-muted-foreground font-semibold"
                >
                  Annulla
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setWeightInput(profile?.weight_kg ? String(profile.weight_kg) : "");
                  setEditingWeight(true);
                }}
                className="flex items-center gap-1 text-sm font-semibold text-foreground"
              >
                {profile?.weight_kg ? `${profile.weight_kg} kg` : "Imposta"}
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Usato per stimare le calorie bruciate durante gli allenamenti.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-semibold text-destructive transition-all active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            Esci
          </button>
        </div>
      </div>

      {/* Download section */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold">Scarica GymBro</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Porta il tuo allenamento sempre con te.
        </p>

        {isStandalone && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
            <div>
              <p className="font-semibold">GymBro è già installata</p>
              <p className="text-xs text-muted-foreground">
                Stai usando la versione app. Apri dal tuo dispositivo per usarla sempre.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowInstructions((prev) => !prev)}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.98]"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showInstructions ? "rotate-180" : ""}`} />
          {showInstructions ? "Nascondi istruzioni" : "Istruzioni installazione"}
        </button>

        {showInstructions && (
          <div className="mt-3 space-y-3">
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Android / Windows</h3>
                  <p className="text-xs text-muted-foreground">Chrome, Edge, Samsung Internet</p>
                </div>
              </div>
              <PWAInstallButton />
              <a
                href={apkUrl}
                download
                className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                Scarica APK (Android)
              </a>
              <details className="group mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
                  Installazione manuale
                </summary>
                <ol className="mt-3 space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">1</span>
                    <span>Apri il menu di Chrome <span className="text-muted-foreground">(⁝ tre punti)</span> in alto a destra</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">2</span>
                    <span>Tocca <strong>Aggiungi a Home</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">3</span>
                    <span>Tocca <strong>Aggiungi</strong> in basso a destra</span>
                  </li>
                </ol>
              </details>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Apple className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">iPhone / iPad</h3>
                  <p className="text-xs text-muted-foreground">Safari</p>
                </div>
              </div>
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">1</span>
                  <span>Apri Safari (non Chrome o altri browser)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">2</span>
                  <span>Tocca il bottone <strong>Condividi</strong> <span className="text-muted-foreground">(rettangolo con freccia)</span> in basso</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">3</span>
                  <span>Scorri e tocca <strong>Aggiungi a Home</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">4</span>
                  <span>Tocca <strong>Aggiungi</strong> in alto a destra</span>
                </li>
              </ol>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
