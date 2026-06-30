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
  Trophy,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { format, startOfWeek, startOfDay, subDays } from "date-fns";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useCircle, type Circle } from "@/hooks/useCircle";
import { MemberWorkouts } from "@/components/MemberWorkouts";
import {
  estimateCalories,
  formatCalories,
  formatVolume,
  getWeightOrDefault,
} from "@/lib/calories";

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
  const { confirm: confirmDialog, ConfirmDialog } = useConfirmDialog();
  const { leaveCircle, isLeaving, deleteCircle, isDeleting, removeMember, isRemovingMember } = useCircle(user.id);

  // Single aggregate query: 1 roundtrip per dataset pesante.
  // RLS garantisce che l'utente possa vedere solo le cerchie di cui è membro.
  const detailQ = useQuery({
    queryKey: ["circle-detail", circleId],
    queryFn: async () => {
      // 1. Dettaglio cerchia — usa RPC SECURITY DEFINER che bypassa RLS
      const { data: raw, error: cErr } = await supabase
        .rpc("get_circle_by_id", { p_circle_id: circleId });
      if (cErr) throw cErr;
      const circle = ((raw ?? [])[0] ?? null) as Circle | null;
      if (!circle) throw new Error("Non hai più accesso a questa cerchia.");

      // 2. Membri (solo user_ids) — usa RPC SECURITY DEFINER che bypassa
      //    la policy circle_members_select limitata a user_id = auth.uid().
      const { data: rawIds, error: mErr } = await supabase.rpc(
        "get_circle_members",
        { p_circle_id: circleId },
      );
      if (mErr) throw mErr;
      const userIds = (rawIds ?? []) as string[];
      if (userIds.length === 0) {
        return {
          circle,
          profiles: [],
          sessions: [],
        };
      }

      // 3. Profili dei membri (display_name, avatar_url)
      const profRes = await supabase
        .from("profiles")
        .select("id, display_name, weight_kg")
        .in("id", userIds);
      const profiles = (profRes.data ?? []) as {
        id: string;
        display_name: string | null;
        weight_kg: number | null;
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

      return { circle: circle as Circle, profiles, sessions };
    },
    staleTime: 1000 * 30,
    refetchInterval: 15_000,
  });

  // Redirect se la cerchia non esiste / non accessibile (RLS blocca se non membro).
  useEffect(() => {
    if (detailQ.isError) {
      toast.error(detailQ.error instanceof Error ? detailQ.error.message : "Errore");
      navigate({ to: "/cerchia" });
    }
  }, [detailQ.isError, detailQ.error, navigate]);

  const { user: memberSearchId } = Route.useSearch();

  const isOwner = !!detailQ.data && detailQ.data.circle.owner_id === user.id;

  // Aggregazione stats per membro (calorie settimana + volume + streak).
  const memberStats = useMemo(() => {
    if (!detailQ.data) return new Map<string, { weeklyVolume: number; weeklyCalories: number; streakDays: number }>();
    const { profiles, sessions } = detailQ.data;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weightMap = new Map(profiles.map((p) => [p.id, getWeightOrDefault(p.weight_kg)]));
    const stats = new Map<string, { weeklyVolume: number; weeklyCalories: number; streakDays: number }>();

    const datesByUser = new Map<string, Set<string>>();
    for (const s of sessions) {
      const d = new Date(s.completed_at);
      if (d >= weekStart) {
        const stat = stats.get(s.user_id) ?? { weeklyVolume: 0, weeklyCalories: 0, streakDays: 0 };
        stat.weeklyVolume += Number(s.total_volume || 0);
        const durMs = new Date(s.completed_at).getTime() - new Date(s.started_at).getTime();
        if (durMs > 0) {
          const w = weightMap.get(s.user_id) ?? 70;
          stat.weeklyCalories += estimateCalories(w, Math.round(durMs / 60000));
        }
        stats.set(s.user_id, stat);
      }
      const key = format(d, "yyyy-MM-dd");
      const set = datesByUser.get(s.user_id) ?? new Set<string>();
      set.add(key);
      datesByUser.set(s.user_id, set);
    }

    const today = startOfDay(new Date());
    for (const [userId, daySet] of datesByUser) {
      let cursor = today;
      if (!daySet.has(format(cursor, "yyyy-MM-dd"))) {
        cursor = subDays(cursor, 1);
      }
      let streak = 0;
      while (daySet.has(format(cursor, "yyyy-MM-dd"))) {
        streak += 1;
        cursor = subDays(cursor, 1);
      }
      const stat = stats.get(userId) ?? { weeklyVolume: 0, weeklyCalories: 0, streakDays: 0 };
      stat.streakDays = streak;
      stats.set(userId, stat);
    }

    for (const p of profiles) {
      if (!stats.has(p.id)) stats.set(p.id, { weeklyVolume: 0, weeklyCalories: 0, streakDays: 0 });
    }

    return stats;
  }, [detailQ.data]);

  const sortedMembers = useMemo(() => {
    if (!detailQ.data) return [];
    const { profiles } = detailQ.data;
    return [...profiles].sort((a, b) => {
      const sa = memberStats.get(a.id) ?? { weeklyVolume: 0, weeklyCalories: 0, streakDays: 0 };
      const sb = memberStats.get(b.id) ?? { weeklyVolume: 0, weeklyCalories: 0, streakDays: 0 };
      return sb.weeklyCalories - sa.weeklyCalories;
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
          <ChevronLeft className="h-5 w-5" /> Cerchie
        </Link>
        <div className="flex items-center gap-3">
          {isOwner ? (
            <button
              onClick={async () => {
                const ok = await confirmDialog(
                  "Eliminare questa cerchia?",
                  "L'azione è irreversibile. Tutti i membri verranno rimossi.",
                );
                if (!ok) return;
                try {
                  await deleteCircle(circle.id);
                  toast.success("Cerchia eliminata.");
                  navigate({ to: "/cerchia" });
                } catch {
                  /* toast gestito da hook */
                }
              }}
              disabled={isDeleting}
              className="text-xs font-semibold text-destructive disabled:opacity-60"
            >
              <Trash2 className="mr-1 inline h-3.5 w-3.5" />
              Elimina
            </button>
          ) : (
            <button
              onClick={async () => {
                const ok = await confirmDialog(
                  "Uscire da questa cerchia?",
                  "Potrai rientrare in qualsiasi momento con il codice.",
                );
                if (!ok) return;
                try {
                  await leaveCircle(circle.id);
                  toast.success("Hai lasciato la cerchia.");
                  navigate({ to: "/cerchia" });
                } catch {
                  /* toast gestito da hook */
                }
              }}
              disabled={isLeaving}
              className="text-xs font-semibold text-muted-foreground disabled:opacity-60"
            >
              <LogOut className="mr-1 inline h-3.5 w-3.5" />
              Esci
            </button>
          )}
        </div>
      </header>

      {/* Title + meta */}
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Users className="mr-1 inline h-3 w-3" />
          {detailQ.data.profiles.length}{" "}
          {detailQ.data.profiles.length === 1 ? "membro" : "membri"}
          {isOwner && " · owner"}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{circle.name}</h1>
      </div>

      {isOwner && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <RevealCode code={circle.code} />
        </div>
      )}

      {/* Members */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Membri</h2>
        <div className="space-y-2">
          {sortedMembers.map((p) => {
            const s = memberStats.get(p.id) ?? { weeklyVolume: 0, weeklyCalories: 0, streakDays: 0 };
            const isThisUser = p.id === user.id;
            return (
              <Link
                key={p.id}
                to="/cerchia/$circleId"
                search={{ user: p.id }}
                params={{ circleId }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  {(p.display_name ?? "?").trim().slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    <span className="truncate">
                      {p.display_name?.trim() || "Atleta"}
                    </span>
                    {isThisUser && (
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        (tu)
                      </span>
                    )}
                    {isOwner && p.id === circle.owner_id && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
                        Coach
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>🔥 {s.streakDays}</span>
                    <span>{formatCalories(s.weeklyCalories)}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span>{formatVolume(s.weeklyVolume)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {s.weeklyCalories > 0 && (
                    <Trophy className="h-4 w-4 text-muted-foreground/60" />
                  )}
                  {isOwner && p.id !== circle.owner_id && (
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const ok = await confirmDialog(
                          "Rimuovere questo membro?",
                          `${p.display_name?.trim() || "Atleta"} non farà più parte della cerchia.`,
                        );
                        if (!ok) return;
                        try {
                          await removeMember(circle.id, p.id);
                        } catch { /* toast gestito da hook */ }
                      }}
                      disabled={isRemovingMember}
                      className="ml-1 rounded-full p-1 text-muted-foreground/50 hover:text-destructive disabled:opacity-60"
                      aria-label="Rimuovi membro"
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Codice invito a svelamento
// ─────────────────────────────────────────────────────────────────────────────
function RevealCode({ code }: { code: string }) {
  const [show, setShow] = useState(false);
  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="w-full text-left"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Codice invito
        </p>
        <p className="mt-2 text-sm font-semibold text-muted-foreground/70">
          Tocca per mostrare
        </p>
      </button>
    );
  }
  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Codice invito
      </p>
      <div className="mt-2 flex items-center justify-between">
        <code className="text-2xl font-black tracking-[0.3em]">{code}</code>
        <CopyCodeButton text={code} label="Copia codice" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Condividi questo codice per invitare nuovi compagni di allenamento.
      </p>
    </>
  );
}

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
