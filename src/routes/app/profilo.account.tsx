import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Plus, LogOut, ChevronDown, CheckCircle2, Lock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { isLegacyEmail } from "@/lib/legacy-email";
import { getRank, rankName, nextRankName, RANK_TIERS } from "@/lib/ranks";
import { useTotalWorkouts } from "@/hooks/useTotalWorkouts";
import { useAchievements } from "@/hooks/useAchievements";
import { BadgeGrid } from "@/components/BadgeGrid";

export const Route = createFileRoute("/app/profilo/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user, profile } = Route.useRouteContext();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [addingEmail, setAddingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [showRanks, setShowRanks] = useState(false);
  const name = profile?.display_name || t("Atleta", "Athlete");
  const totalWorkoutsQ = useTotalWorkouts(user.id);
  const rank = getRank(totalWorkoutsQ.data ?? 0);
  const achievementsQ = useAchievements(user.id);

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
    <>
      {/* Profile card */}
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

      {/* Rank card */}
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

      {/* All ranks */}
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

      {/* Achievements / Badges */}
      {achievementsQ.data && (
        <div className="mb-8">
          <BadgeGrid achievements={achievementsQ.data} />
        </div>
      )}
    </>
  );
}
