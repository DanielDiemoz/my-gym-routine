import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft,
  Users,
  LogOut,
  Trash2,
  ChevronDown,
  ChevronRight,
  UserX,
  Dumbbell,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { startOfWeek, endOfWeek, subDays } from "date-fns";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useCircle, type Circle } from "@/hooks/useCircle";
import { MemberWorkouts } from "@/components/MemberWorkouts";
import { CircleChat, ChatBubbleButton } from "@/components/CircleChat";
import { formatVolume } from "@/lib/calories";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/cerchia/$circleId")({
  component: CircleDetailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    user: search.user as string | undefined,
  }),
});

/**
 * Pagina di dettaglio di una singola cerchia — TASK 5.
 * - Header con nome, numero membri, codice (se owner), CTA Esci / Elimina.
 * - Sezione Membri: avatar + display_name + 🔥 streak + volume settimanale,
 *   ordinati per volume settimanale DESC.
 * - Sezione Feed: ultimi 20 allenamenti (tutti i membri) ordinati per
 *   completed_at DESC, accordion (una card aperta alla volta).
 */
function CircleDetailPage() {
  const { circleId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { display: fmtWeight } = useWeightUnit();
  const { t, language } = useLanguage();
  const intlLocale = language === "en" ? "en-US" : "it-IT";
  const { confirm: confirmDialog, ConfirmDialog } = useConfirmDialog();
  const {
    leaveCircle,
    isLeaving,
    deleteCircle,
    isDeleting,
    removeMember,
    isRemovingMember,
    updateNickname,
    isUpdatingNickname,
  } = useCircle(user.id);

  // Single aggregate query: 1 roundtrip per dataset pesante.
  // RLS garantisce che l'utente possa vedere solo le cerchie di cui è membro.
  const detailQ = useQuery({
    queryKey: ["circle-detail", circleId],
    queryFn: async () => {
      // 1. Dettaglio cerchia — usa RPC SECURITY DEFINER che bypassa RLS
      const { data: raw, error: cErr } = await supabase.rpc("get_circle_by_id", {
        p_circle_id: circleId,
      });
      if (cErr) throw cErr;
      const circle = ((raw ?? [])[0] ?? null) as Circle | null;
      if (!circle) throw new Error("Non hai più accesso a questa cerchia.");

      // 2. Membri — usa RPC SECURITY DEFINER che bypassa RLS.
      //    Restituisce user_id + nickname (se impostato dall'owner).
      const { data: rawMembers, error: mErr } = await supabase.rpc("get_circle_members", {
        p_circle_id: circleId,
      });
      if (mErr) throw mErr;
      const members = (rawMembers ?? []) as {
        user_id: string;
        nickname: string | null;
      }[];
      if (members.length === 0) {
        return {
          circle,
          profiles: [],
          sessions: [],
          nicknameMap: new Map<string, string | null>(),
        };
      }

      const userIds = members.map((m) => m.user_id);
      const nicknameMap = new Map<string, string | null>(
        members.map((m) => [m.user_id, m.nickname]),
      );

      // 3. Profili dei membri (display_name, avatar_url)
      const profRes = await supabase
        .from("profiles")
        .select("id, display_name, weekly_goal")
        .in("id", userIds);
      const profiles = (profRes.data ?? []) as {
        id: string;
        display_name: string | null;
        weekly_goal: number | null;
      }[];

      // 4. Sessioni degli ultimi 365 giorni per i membri.
      //    Bastano per streak (max~365) + volume settimanale (questa settimana).
      const sinceIso = subDays(new Date(), 365).toISOString();
      const sessRes = await supabase
        .from("sessions")
        .select("id, user_id, plan_name, started_at, completed_at, total_volume")
        .in("user_id", userIds)
        .not("completed_at", "is", null)
        .gte("completed_at", sinceIso);
      const sessions = (sessRes.data ?? []) as {
        id: string;
        user_id: string;
        plan_name: string | null;
        started_at: string;
        completed_at: string;
        total_volume: number;
      }[];

      return { circle: circle as Circle, profiles, sessions, nicknameMap };
    },
    staleTime: 1000 * 30,
    refetchInterval: 15_000,
  });

  // Redirect se la cerchia non esiste / non accessibile (RLS blocca se non membro).
  useEffect(() => {
    if (detailQ.isError) {
      toast.error(detailQ.error instanceof Error ? detailQ.error.message : t("Errore", "Error"));
      navigate({ to: "/cerchia" });
    }
  }, [detailQ.isError, detailQ.error, navigate]);

  const { user: memberSearchId } = Route.useSearch();

  const isOwner = !!detailQ.data && detailQ.data.circle.owner_id === user.id;

  // Nickname editing state
  const [editTarget, setEditTarget] = useState<{
    userId: string;
    currentNickname: string;
  } | null>(null);

  const nicknameMap = detailQ.data?.nicknameMap;

  // Mostra nickname se presente, altrimenti display_name
  function resolveName(profileId: string, displayName: string | null): string {
    return nicknameMap?.get(profileId) || displayName?.trim() || t("Atleta", "Athlete");
  }

  function resolveInitials(profileId: string, displayName: string | null): string {
    return (nicknameMap?.get(profileId) || displayName || "?").trim().slice(0, 2).toUpperCase();
  }

  // Aggregazione stats per membro (copertura settimanale + volume).
  const memberStats = useMemo(() => {
    if (!detailQ.data)
      return new Map<
        string,
        { weeklyVolume: number; weeklySessions: number; weeklyGoal: number }
      >();
    const { profiles, sessions } = detailQ.data;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const goalMap = new Map(profiles.map((p) => [p.id, p.weekly_goal ?? 3]));
    const stats = new Map<
      string,
      { weeklyVolume: number; weeklySessions: number; weeklyGoal: number }
    >();

    for (const s of sessions) {
      const d = new Date(s.started_at);
      if (d >= weekStart && d <= weekEnd) {
        const stat = stats.get(s.user_id) ?? {
          weeklyVolume: 0,
          weeklySessions: 0,
          weeklyGoal: goalMap.get(s.user_id) ?? 3,
        };
        stat.weeklyVolume += Number(s.total_volume || 0);
        stat.weeklySessions += 1;
        stats.set(s.user_id, stat);
      }
    }

    for (const p of profiles) {
      if (!stats.has(p.id)) {
        stats.set(p.id, {
          weeklyVolume: 0,
          weeklySessions: 0,
          weeklyGoal: goalMap.get(p.id) ?? 3,
        });
      }
    }

    return stats;
  }, [detailQ.data]);

  const aggregate = useMemo(() => {
    if (!detailQ.data) return { weeklyKg: 0, weekSessions: 0, weekGoal: 0 };
    let weeklyKg = 0;
    let weekSessions = 0;
    let weekGoal = 0;
    for (const st of memberStats.values()) {
      weeklyKg += st.weeklyVolume;
      weekSessions += st.weeklySessions;
      weekGoal += st.weeklyGoal;
    }
    return { weeklyKg, weekSessions, weekGoal };
  }, [detailQ.data, memberStats]);

  const sortedMembers = useMemo(() => {
    if (!detailQ.data) return [];
    const { profiles } = detailQ.data;
    return [...profiles].sort((a, b) => {
      const sa = memberStats.get(a.id) ?? { weeklyVolume: 0, weeklySessions: 0, weeklyGoal: 3 };
      const sb = memberStats.get(b.id) ?? { weeklyVolume: 0, weeklySessions: 0, weeklyGoal: 3 };
      return sb.weeklyVolume - sa.weeklyVolume;
    });
  }, [detailQ.data, memberStats]);

  if (memberSearchId) {
    return <MemberWorkouts circleId={circleId} userId={memberSearchId} />;
  }

  if (detailQ.isLoading) {
    return <DetailSkeleton />;
  }

  if (!detailQ.data) {
    return null;
  }

  const circle = detailQ.data.circle;

  return (
    <div className="container-app pt-6">
      <header className="mb-6 flex items-center justify-between">
        <Link
          to="/cerchia"
          className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" /> {t("Cerchie", "Circles")}
        </Link>
        <div className="flex items-center gap-2">
          <CircleChat circleId={circle.id} circleName={circle.name} userId={user.id} />
          {isOwner ? (
            <button
              onClick={async () => {
                const ok = await confirmDialog(
                  t("Eliminare questa cerchia?", "Delete this circle?"),
                  t("L'azione è irreversibile. Tutti i membri verranno rimossi.", "This action is irreversible. All members will be removed."),
                );
                if (!ok) return;
                try {
                  await deleteCircle(circle.id);
                  toast.success(t("Cerchia eliminata.", "Circle deleted."));
                  navigate({ to: "/cerchia" });
                } catch {
                  /* toast gestito da hook */
                }
              }}
              disabled={isDeleting}
              className="text-xs font-semibold text-destructive disabled:opacity-60"
            >
              <Trash2 className="mr-1 inline h-3.5 w-3.5" />
              {t("Elimina", "Delete")}
            </button>
          ) : (
            <button
              onClick={async () => {
                const ok = await confirmDialog(
                  t("Uscire da questa cerchia?", "Leave this circle?"),
                  t("Potrai rientrare in qualsiasi momento con il codice.", "You can rejoin anytime with the code."),
                );
                if (!ok) return;
                try {
                  await leaveCircle(circle.id);
                  toast.success(t("Hai lasciato la cerchia.", "You left the circle."));
                  navigate({ to: "/cerchia" });
                } catch {
                  /* toast gestito da hook */
                }
              }}
              disabled={isLeaving}
              className="text-xs font-semibold text-muted-foreground disabled:opacity-60"
            >
              <LogOut className="mr-1 inline h-3.5 w-3.5" />
              {t("Esci", "Leave")}
            </button>
          )}
        </div>
      </header>

      {/* Header icona + titolo */}
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-900">
          <Dumbbell className="h-6 w-6 text-white" strokeWidth={2} />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-black">{circle.name}</h1>
      </div>

      {/* Riga informativa membri */}
      <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {detailQ.data.profiles.length} {detailQ.data.profiles.length === 1 ? t("membro", "member") : t("membri", "members")}
        {isOwner && " · owner"}
      </p>

      {/* Codice invito: tutti i membri possono copiarlo */}
      <div className="mb-6 flex items-center justify-between rounded-xl border-[0.5px] border-neutral-200 bg-[#F0F0F0] px-4 py-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("Codice invito", "Invite code")}
          </p>
          <p className="mt-1 font-mono text-base tracking-[0.25em] text-foreground/80">
            •••• •••• ••••
          </p>
        </div>
        <CopyCodeButton text={circle.code} label={t("Copia", "Copy")} size="sm" />
      </div>

      {/* Statistiche aggregate cerchia */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border-[0.5px] border-neutral-200 bg-[#F0F0F0] px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("kg totali cerchia", "circle total kg")}
          </p>
          <p className="mt-1 text-2xl font-bold text-black">
            {Math.round(aggregate.weeklyKg).toLocaleString(intlLocale)}
          </p>
        </div>
        <div className="rounded-xl border-[0.5px] border-neutral-200 bg-[#F0F0F0] px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("allenamenti sett.", "weekly workouts")}
          </p>
          <p className="mt-1 text-2xl font-bold text-black">
            {aggregate.weekSessions}/{aggregate.weekGoal}
          </p>
        </div>
      </div>

      {/* Members */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold">{t("Membri", "Members")}</h2>
        <div className="space-y-2">
          {sortedMembers.map((p, idx) => {
            const s = memberStats.get(p.id) ?? {
              weeklyVolume: 0,
              weeklySessions: 0,
              weeklyGoal: 3,
            };
            const isThisUser = p.id === user.id;
            const isCircleOwner = p.id === circle.owner_id;
            const progress = Math.min(s.weeklySessions / s.weeklyGoal, 1);
            const ringCirc = 2 * Math.PI * 22;
            const ringColor = `oklch(${0.7 - 0.2 * progress} ${0.24 * progress} 280)`;
            return (
              <Link
                key={p.id}
                to="/cerchia/$circleId"
                search={{ user: p.id }}
                params={{ circleId }}
                className="flex items-center gap-3 rounded-2xl border-[0.5px] border-neutral-200 bg-card px-4 py-3"
              >
                {/* Rango */}
                <span className="w-5 text-center text-sm font-semibold text-muted-foreground">
                  {idx + 1}
                </span>

                {/* Avatar con anello di progresso */}
                <div className="relative h-12 w-12 shrink-0">
                  <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
                    <circle cx="24" cy="24" r="22" fill="none" stroke="#E5E5E5" strokeWidth="3" />
                    <circle
                      cx="24"
                      cy="24"
                      r="22"
                      fill="none"
                      stroke={ringColor}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={ringCirc}
                      strokeDashoffset={ringCirc * (1 - progress)}
                    />
                  </svg>
                  <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {resolveInitials(p.id, p.display_name)}
                  </div>
                </div>

                {/* Nome + badge + dati */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    <span className="truncate">{resolveName(p.id, p.display_name)}</span>
                    {isThisUser && isCircleOwner && (
                      <span className="rounded-full bg-[#F0F0F0] px-2 py-0.5 text-[10px] font-semibold text-black">
                        tu · owner
                      </span>
                    )}
                    {isThisUser && !isCircleOwner && (
                      <span className="rounded-full bg-[#F0F0F0] px-2 py-0.5 text-[10px] font-semibold text-black">
                        tu
                      </span>
                    )}
                    {!isThisUser && isCircleOwner && (
                      <span className="rounded-full bg-[#F0F0F0] px-2 py-0.5 text-[10px] font-semibold text-black">
                        owner
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xs text-foreground/80">
                    {formatVolume(s.weeklyVolume)} · {s.weeklySessions}/
                    {s.weeklyGoal}
                  </p>
                </div>

                {/* Azioni */}
                <div className="flex items-center gap-1 shrink-0">
                  {isOwner && p.id !== circle.owner_id && (
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const ok = await confirmDialog(
                          t("Rimuovere questo membro?", "Remove this member?"),
                          t(`${resolveName(p.id, p.display_name)} non farà più parte della cerchia.`, `${resolveName(p.id, p.display_name)} will no longer be part of the circle.`),
                        );
                        if (!ok) return;
                        try {
                          await removeMember(circle.id, p.id);
                        } catch {
                          /* toast gestito da hook */
                        }
                      }}
                      disabled={isRemovingMember}
                      className="rounded-full p-1 text-muted-foreground/50 hover:text-destructive disabled:opacity-60"
                      aria-label={t("Rimuovi membro", "Remove member")}
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {ConfirmDialog}

      {editTarget && (
        <NicknameModal
          circleId={circle.id}
          userId={editTarget.userId}
          initial={editTarget.currentNickname}
          isSaving={isUpdatingNickname}
          onSave={async (nickname) => {
            await updateNickname(circle.id, editTarget.userId, nickname);
            setEditTarget(null);
          }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Codice invito a svelamento
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loading
// ─────────────────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="container-app pt-6">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-2 h-9 w-48" />
      <Skeleton className="mt-5 h-20 w-full rounded-2xl" />

      <div className="mt-6 space-y-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nickname edit modal
// ─────────────────────────────────────────────────────────────────────────────
function NicknameModal({
  circleId,
  userId,
  initial,
  isSaving,
  onSave,
  onClose,
}: {
  circleId: string;
  userId: string;
  initial: string;
  isSaving: boolean;
  onSave: (nickname: string) => Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-background p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border sm:hidden" />
        <h3 className="text-xl font-bold">{t("Modifica nome", "Edit name")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Il nickname sarà visibile a tutti i membri della cerchia.", "The nickname will be visible to all circle members.")}
        </p>

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSaving) onSave(value);
          }}
          placeholder="Nickname"
          maxLength={30}
          className="mt-5 w-full rounded-2xl border border-border bg-card px-4 py-3 text-base outline-none focus:border-foreground"
        />
        <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          {t("max 30 caratteri · lascia vuoto per usare il nome originale", "max 30 chars · leave empty to use the original name")}
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onClose()}
            className="no-tap-highlight flex-1 rounded-full border border-border bg-card py-3.5 text-sm font-bold uppercase tracking-wide active:scale-[0.98]"
          >
            {t("Annulla", "Cancel")}
          </button>
          <button
            onClick={() => onSave(value)}
            disabled={isSaving}
            className="no-tap-highlight flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98] disabled:opacity-60"
          >
            {isSaving ? "..." : t("Salva", "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}
