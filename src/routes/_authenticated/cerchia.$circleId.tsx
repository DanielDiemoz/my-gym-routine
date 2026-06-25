import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft,
  Users,
  LogOut,
  Trash2,
  ChevronDown,
  Trophy,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { formatDistanceToNow, format, startOfWeek, startOfDay, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { useWeightUnit } from "@/hooks/useWeightUnit";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useCircle, type Circle } from "@/hooks/useCircle";

export const Route = createFileRoute("/_authenticated/cerchia/$circleId")({
  component: CircleDetailPage,
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
  const qc = useQueryClient();
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
      if (!circle) throw new Error("Cerchia non trovata o non accessibile.");

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
          feedLogs: [],
        };
      }

      // 3. Profili dei membri (display_name, avatar_url)
      const profRes = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      const profiles = (profRes.data ?? []) as {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
      }[];

      // 4. Sessioni degli ultimi 365 giorni per i membri.
      //    Bastano per streak (max~365) + volume settimanale (questa settimana).
      const sinceIso = subDays(new Date(), 365).toISOString();
      const sessRes = await supabase
        .from("sessions")
        .select("id, user_id, plan_name, completed_at, total_volume")
        .in("user_id", userIds)
        .not("completed_at", "is", null)
        .gte("completed_at", sinceIso);
      const sessions = (sessRes.data ?? []) as {
        id: string;
        user_id: string;
        plan_name: string | null;
        completed_at: string;
        total_volume: number;
      }[];

      // 5. Feed: ultime 20 sessioni ordinate completed_at DESC
      const top20 = [...sessions]
        .sort(
          (a, b) =>
            new Date(b.completed_at).getTime() -
            new Date(a.completed_at).getTime(),
        )
        .slice(0, 20);
      const topIds = top20.map((s) => s.id);
      let feedLogs: {
        id: string;
        session_id: string;
        exercise_name: string;
        set_number: number;
        reps: number;
        weight: number;
      }[] = [];
      if (topIds.length > 0) {
        const logsRes = await supabase
          .from("session_logs")
          .select("id, session_id, exercise_name, set_number, reps, weight")
          .in("session_id", topIds);
        feedLogs = (logsRes.data ?? []) as typeof feedLogs;
      }

      return { circle: circle as Circle, profiles, sessions, feedLogs };
    },
    staleTime: 1000 * 30,
  });

  // Redirect se la cerchia non esiste / non accessibile (RLS blocca se non membro).
  useEffect(() => {
    if (detailQ.isError) {
      toast.error(detailQ.error instanceof Error ? detailQ.error.message : "Errore");
      navigate({ to: "/cerchia" });
    }
  }, [detailQ.isError, detailQ.error, navigate]);

  const isOwner = !!detailQ.data && detailQ.data.circle.owner_id === user.id;

  // Aggregazione stats per membro (volume settimana + streak).
  const memberStats = useMemo(() => {
    if (!detailQ.data) return new Map<string, { weeklyVolume: number; streakDays: number }>();
    const { profiles, sessions } = detailQ.data;
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const stats = new Map<string, { weeklyVolume: number; streakDays: number }>();

    // Mappa user_id → set di date (yyyymmdd) in cui ha completato un workout.
    const datesByUser = new Map<string, Set<string>>();
    for (const s of sessions) {
      const d = new Date(s.completed_at);
      // Weekly volume
      if (d >= weekStart) {
        const stat = stats.get(s.user_id) ?? { weeklyVolume: 0, streakDays: 0 };
        stat.weeklyVolume += Number(s.total_volume || 0);
        stats.set(s.user_id, stat);
      }
      // Per streak: salvo solo la chiave giorno (no orario).
      const key = format(d, "yyyy-MM-dd");
      const set = datesByUser.get(s.user_id) ?? new Set<string>();
      set.add(key);
      datesByUser.set(s.user_id, set);
    }

    // Calcolo streak: cammino all'indietro da oggi (se oggi fatta) o da ieri
    // (se oggi no). Mi fermo al primo giorno senza workout.
    const today = startOfDay(new Date());
    for (const [userId, daySet] of datesByUser) {
      let cursor = today;
      // Se oggi non ha sessioni, parto da ieri (streak "conservato").
      if (!daySet.has(format(cursor, "yyyy-MM-dd"))) {
        cursor = subDays(cursor, 1);
      }
      let streak = 0;
      while (daySet.has(format(cursor, "yyyy-MM-dd"))) {
        streak += 1;
        cursor = subDays(cursor, 1);
      }
      const stat = stats.get(userId) ?? { weeklyVolume: 0, streakDays: 0 };
      stat.streakDays = streak;
      stats.set(userId, stat);
    }

    // Includo i membri senza stats (default 0).
    for (const p of profiles) {
      if (!stats.has(p.id)) stats.set(p.id, { weeklyVolume: 0, streakDays: 0 });
    }

    return stats;
  }, [detailQ.data]);

  const sortedMembers = useMemo(() => {
    if (!detailQ.data) return [];
    const { profiles } = detailQ.data;
    return [...profiles].sort((a, b) => {
      const sa = memberStats.get(a.id) ?? { weeklyVolume: 0, streakDays: 0 };
      const sb = memberStats.get(b.id) ?? { weeklyVolume: 0, streakDays: 0 };
      return sb.weeklyVolume - sa.weeklyVolume;
    });
  }, [detailQ.data, memberStats]);

  const feedSorted = useMemo(() => {
    if (!detailQ.data) return [];
    return [...detailQ.data.sessions]
      .sort(
        (a, b) =>
          new Date(b.completed_at).getTime() -
          new Date(a.completed_at).getTime(),
      )
      .slice(0, 20)
      .map((s) => ({
        session: s,
        logs: detailQ.data!.feedLogs.filter((l) => l.session_id === s.id),
        author: detailQ.data!.profiles.find((p) => p.id === s.user_id) ?? null,
      }));
  }, [detailQ.data]);

  // Accordion: una sola card espansa alla volta (TASK 5).
  // Lo stato è qui nel parent così tap su una nuova card chiude le altre.
  const [openFeedId, setOpenFeedId] = useState<string | null>(null);

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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Codice invito
          </p>
          <div className="mt-2 flex items-center justify-between">
            <code className="text-2xl font-black tracking-[0.3em]">{circle.code}</code>
            <CopyCodeButton text={circle.code} label="Copia codice" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Condividi questo codice per invitare nuovi compagni di allenamento.
          </p>
        </div>
      )}

      {/* Members */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Membri</h2>
        <div className="space-y-2">
          {sortedMembers.map((p) => {
            const s = memberStats.get(p.id) ?? { weeklyVolume: 0, streakDays: 0 };
            const isThisUser = p.id === user.id;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <Avatar name={p.display_name} url={p.avatar_url} />
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
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>🔥 {s.streakDays}</span>
                    <span className="truncate">{fmtWeight(s.weeklyVolume, { digits: 0 })} / sett.</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {s.weeklyVolume > 0 && (
                    <Trophy className="h-4 w-4 text-muted-foreground/60" />
                  )}
                  {isOwner && p.id !== circle.owner_id && (
                    <button
                      onClick={async () => {
                        const ok = await confirmDialog(
                          "Rimuovere questo membro?",
                          `${p.display_name?.trim() || "Atleta"} non farà più parte della cerchia.`,
                        );
                        if (!ok) return;
                        try {
                          await removeMember(circle.id, p.id);
                          qc.invalidateQueries({ queryKey: ["circle-detail", circleId] });
                          toast.success("Membro rimosso.");
                        } catch { /* toast gestito da hook */ }
                      }}
                      disabled={isRemovingMember}
                      className="ml-1 rounded-full p-1 text-muted-foreground/50 hover:text-destructive disabled:opacity-60"
                      aria-label="Rimuovi membro"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feed */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Feed allenamenti</h2>
        {feedSorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nessun allenamento recente in questa cerchia.
          </p>
        ) : (
          <div className="space-y-2">
            {feedSorted.map((item) => (
              <FeedItem
                key={item.session.id}
                session={item.session}
                authorName={item.author?.display_name ?? "Atleta"}
                authorAvatar={item.author?.avatar_url ?? null}
                logs={item.logs}
                fmtWeight={fmtWeight}
                isOpen={openFeedId === item.session.id}
                onToggle={() =>
                  setOpenFeedId((prev) =>
                    prev === item.session.id ? null : item.session.id,
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      {ConfirmDialog}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feed item (accordion — una sola card aperta alla volta tramite stato locale)
// ─────────────────────────────────────────────────────────────────────────────
function FeedItem({
  session,
  authorName,
  authorAvatar,
  logs,
  fmtWeight,
  isOpen,
  onToggle,
}: {
  session: {
    id: string;
    plan_name: string | null;
    completed_at: string;
    total_volume: number;
  };
  authorName: string;
  authorAvatar: string | null;
  logs: { id: string; exercise_name: string; set_number: number; reps: number; weight: number }[];
  fmtWeight: (kg: number | null | undefined, opts?: { digits?: number }) => string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const open = isOpen;

  // Raggruppa log per esercizio. I set sono ordinati per `set_number`
  // (NON per reps!) perché l'ordine di esecuzione è la cosa importante per
  // l'utente: "Set 1" → "Set 2" → "Set 3", anche se le reps variano.
  // Supabase restituisce i log per sessione ma NON garantisce l'ordine.
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sets: { setNumber: number; reps: number; weight: number }[] }
    >();
    for (const l of logs) {
      const key = l.exercise_name;
      const entry = map.get(key) ?? { name: l.exercise_name, sets: [] };
      entry.sets.push({
        setNumber: l.set_number,
        reps: l.reps,
        weight: Number(l.weight),
      });
      map.set(key, entry);
    }
    for (const e of map.values()) {
      e.sets.sort((a, b) => a.setNumber - b.setNumber);
    }
    return [...map.values()];
  }, [logs]);

  const when = formatDistanceToNow(new Date(session.completed_at), {
    addSuffix: true,
    locale: it,
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={onToggle}
        className="no-tap-highlight flex w-full items-start gap-3 px-4 py-3 text-left active:scale-[0.99]"
        aria-expanded={open}
      >
        <Avatar name={authorName} url={authorAvatar} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold">{authorName}</div>
            <div className="text-xs text-muted-foreground">{when}</div>
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {session.plan_name ?? "Allenamento"} ·{" "}
            {fmtWeight(Number(session.total_volume), { digits: 0 })} ·{" "}
            {grouped.length} {grouped.length === 1 ? "esercizio" : "esercizi"}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border bg-background/50 px-4 py-3">
          {grouped.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">Nessun dettaglio disponibile.</p>
          ) : (
            grouped.map((g) => (
              <div key={g.name}>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {g.name}
                </div>
                <div className="mt-1 space-y-1">
                  {g.sets.map((s, i) => (
                    <div
                      key={i}
                      className="flex justify-between rounded-lg bg-card px-3 py-1.5 text-xs"
                    >
                      <span className="font-semibold">Set {i + 1}</span>
                      <span>
                        {s.reps} × {fmtWeight(s.weight, { digits: 1 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div className="text-[10px] text-muted-foreground">
            {format(new Date(session.completed_at), "EEEE d MMM, HH:mm", { locale: it })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers riusati
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({
  name,
  url,
  size = "md",
}: {
  name: string | null | undefined;
  url: string | null | undefined;
  size?: "sm" | "md";
}) {
  const initials = (name ?? "?").trim().slice(0, 2).toUpperCase();
  const dim = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "Avatar"}
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`${dim} shrink-0 flex items-center justify-center rounded-full bg-muted font-bold text-muted-foreground`}
      aria-label={name ?? "Avatar"}
    >
      {initials}
    </div>
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

      <div className="mt-8 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
    </div>
  );
}
