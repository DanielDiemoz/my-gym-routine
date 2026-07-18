import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft,
  ChevronDown,
  User,
  Mail,
  Plus,
  LogOut,
  Smartphone,
  Apple,
  CheckCircle2,
  Download,
  Languages,
  Lock,
} from "lucide-react";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";
import { getRank, rankName, nextRankName, RANK_TIERS } from "@/lib/ranks";
import { useTotalWorkouts } from "@/hooks/useTotalWorkouts";
import { toast } from "sonner";
import { isLegacyEmail } from "@/lib/legacy-email";

export const Route = createFileRoute("/app/profilo")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile } = Route.useRouteContext();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [addingEmail, setAddingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showRanks, setShowRanks] = useState(false);
  const name = profile?.display_name || t("Atleta", "Athlete");
  const apkUrl = "/apk/gymbro.apk";
  const totalWorkoutsQ = useTotalWorkouts(user.id);
  const rank = getRank(totalWorkoutsQ.data ?? 0);

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
      toast.success(
        t(
          "Email aggiunta! Controlla la posta per verificarla.",
          "Email added! Check your inbox to verify.",
        ),
      );
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
          <ChevronLeft className="h-5 w-5" /> {t("Dashboard", "Dashboard")}
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
              <p className="text-sm text-muted-foreground">{t("Nessuna email", "No email")}</p>
            )}
          </div>
        </div>

        {user.email && !isLegacyEmail(user.email) ? null : addingEmail ? (
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
              {saving ? t("Salvataggio…", "Saving…") : t("Salva", "Save")}
            </button>
            <button
              onClick={() => {
                setAddingEmail(false);
                setNewEmail("");
              }}
              className="text-sm text-muted-foreground font-semibold"
            >
              {t("Annulla", "Cancel")}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingEmail(true)}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            {t("Aggiungi una email", "Add an email")}
          </button>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Languages className="h-4 w-4" />
            {t("Lingua", "Language")}
          </div>
          <LanguageToggle />
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-semibold text-destructive transition-all active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            {t("Esci", "Log out")}
          </button>
        </div>
      </div>

      {/* Rank section */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col items-center text-center">
          <img
            src={rank.tier.image}
            alt={rankName(rank.tier, language)}
            className="h-28 w-28 rounded-2xl object-contain"
          />
          <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("Rank", "Rank")}
          </p>
          <h2 className="text-xl font-bold">{rankName(rank.tier, language)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="text-2xl font-bold text-foreground">{rank.totalWorkouts}</span>{" "}
            {t("allenamenti", "workouts")}
          </p>
        </div>

        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(rank.progress * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {rank.nextThreshold === null ? (
              t("Hai raggiunto il rank massimo!", "You reached the max rank!")
            ) : (
              <>
                {t("Mancano", "Need")} {rank.workoutsToNext}{" "}
                {t("allenamenti a", "workouts to reach")} {nextRankName(rank.tier.level, language)}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Tutti i rank */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-5">
        <button
          type="button"
          onClick={() => setShowRanks((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-base font-bold">{t("Vedi ranks", "View ranks")}</span>
          <ChevronDown
            className={`h-5 w-5 text-muted-foreground transition-transform ${showRanks ? "rotate-180" : ""}`}
          />
        </button>

        {showRanks && (
          <ul className="mt-4 space-y-2">
            {RANK_TIERS.map((tier) => {
              const isCurrent = tier.level === rank.tier.level;
              const isUnlocked = rank.totalWorkouts >= tier.threshold;
              return (
                <li
                  key={tier.level}
                  className={`flex items-center gap-3 rounded-xl border border-border px-3 py-2 ${
                    isCurrent ? "bg-primary/5 border-primary/30" : ""
                  }`}
                >
                  <img
                    src={tier.image}
                    alt={rankName(tier, language)}
                    className={`h-9 w-9 rounded-full object-cover ${isUnlocked ? "" : "opacity-40 grayscale"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {rankName(tier, language)}
                      {isCurrent && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {t("attuale", "current")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tier.threshold === 0
                        ? t("Rank iniziale", "Starting rank")
                        : `${tier.threshold} ${t("allenamenti", "workouts")}`}
                    </p>
                  </div>
                  {isUnlocked ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Download section */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold">{t("Scarica GymBro", "Download GymBro")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("Porta il tuo allenamento sempre con te.", "Take your workout with you anywhere.")}
        </p>

        {isStandalone && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
            <div>
              <p className="font-semibold">
                {t("GymBro è già installata", "GymBro is already installed")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Stai usando la versione app. Apri dal tuo dispositivo per usarla sempre.",
                  "You're using the app version. Open it from your device to use it anytime.",
                )}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowInstructions((prev) => !prev)}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.98]"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showInstructions ? "rotate-180" : ""}`}
          />
          {showInstructions
            ? t("Nascondi istruzioni", "Hide instructions")
            : t("Istruzioni installazione", "Installation instructions")}
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
                {t("Scarica APK (Android)", "Download APK (Android)")}
              </a>
              <details className="group mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
                  {t("Installazione manuale", "Manual install")}
                </summary>
                <ol className="mt-3 space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      1
                    </span>
                    <span>
                      {t("Apri il menu di Chrome", "Open the Chrome menu")}{" "}
                      <span className="text-muted-foreground">(⁝ tre punti)</span>{" "}
                      {t("in alto a destra", "top right")}
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      2
                    </span>
                    <span>
                      {t("Tocca", "Tap")}{" "}
                      <strong>{t("Aggiungi a Home", "Add to Home screen")}</strong>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      3
                    </span>
                    <span>
                      {t("Tocca", "Tap")} <strong>{t("Aggiungi", "Add")}</strong>{" "}
                      {t("in basso a destra", "bottom right")}
                    </span>
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
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    1
                  </span>
                  <span>
                    {t(
                      "Apri Safari (non Chrome o altri browser)",
                      "Open Safari (not Chrome or other browsers)",
                    )}
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    2
                  </span>
                  <span>
                    {t("Tocca il bottone", "Tap the")} <strong>{t("Condividi", "Share")}</strong>{" "}
                    <span className="text-muted-foreground">(rettangolo con freccia)</span>{" "}
                    {t("in basso", "at the bottom")}
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    3
                  </span>
                  <span>
                    {t("Scorri e tocca", "Scroll and tap")}{" "}
                    <strong>{t("Aggiungi a Home", "Add to Home screen")}</strong>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    4
                  </span>
                  <span>
                    {t("Tocca", "Tap")} <strong>{t("Aggiungi", "Add")}</strong>{" "}
                    {t("in alto a destra", "top right")}
                  </span>
                </li>
              </ol>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
