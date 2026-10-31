import { Flame, Trophy, Target, Sparkles } from "lucide-react";
import { differenceInCalendarDays, format, subDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n";

interface Props {
  /** Sessioni completate (almeno completed_at valorizzato). */
  sessions: Array<{ completed_at: string | null; total_volume?: number }>;
  /** Obiettivo settimanale corrente (1–7). */
  weeklyGoal: number;
  /** Numero di allenamenti completati questa settimana. */
  weeklyCount: number;
  /** Callback per aggiornare weekly_goal. */
  onChangeGoal: (n: number) => void;
  /** Se true mostra uno skeleton (week-goal non ancora caricato). */
  isLoading?: boolean;
}

/**
 * Card Streak per la dashboard GymBro:
 * - 🔥 streak attuale (oggi o ieri → walk-back)
 * - Record personale (max run di giorni consecutivi)
 * - Barra progresso settimanale vs `weeklyGoal`
 * - Select per modificare weekly_goal (1-7)
 */
export function StreakCard({ sessions, weeklyGoal, weeklyCount, onChangeGoal, isLoading }: Props) {
  const { t } = useLanguage();
  const safeWeeklyGoal = Math.max(1, Math.min(7, weeklyGoal || 3));
  const completedAts = sessions.map((s) => s.completed_at).filter((v): v is string => !!v);
  const { current, record } = computeStreak(completedAts);
  const ratio = Math.min(weeklyCount / safeWeeklyGoal, 1);
  const goalReached = weeklyCount >= safeWeeklyGoal;

  return (
    <section className="bento-card mt-3 relative overflow-hidden rounded-3xl p-5">
      {current > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              current > 0
                ? "bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/25"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Flame className={`h-5 w-5 ${current > 0 ? "fill-orange-500/20" : ""}`} />
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("Streak attiva", "Active streak")}
            </h3>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight tabular-nums">
                {isLoading ? "—" : current}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {current === 1 ? t("giorno", "day") : t("giorni", "days")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-muted-foreground">{t("Record", "Best")}:</span>
          <span className="font-bold text-foreground tabular-nums">
            {isLoading ? "—" : record}
          </span>
        </div>
      </div>

      {/* Helper se lo streak è rotto ma esiste un record passato. */}
      {!isLoading && current === 0 && record > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("Allena oggi per riaccendere la tua serie positiva.", "Train today to reignite your streak.")}
        </p>
      )}
      {!isLoading && current > 0 && current === record && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
          <Sparkles className="h-3 w-3" /> {t("Nuovo record personale!", "New personal best!")}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border/60">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-primary" />{" "}
            {t("Obiettivo settimanale", "Weekly goal")}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`font-bold tabular-nums ${
                goalReached ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              }`}
            >
              {weeklyCount}/{safeWeeklyGoal}
            </span>
            <Select value={String(safeWeeklyGoal)} onValueChange={(v) => onChangeGoal(Number(v))}>
              <SelectTrigger
                aria-label={t("Obiettivo settimanale", "Weekly goal")}
                className="h-7 w-auto rounded-full border-border bg-muted/60 px-2.5 text-[11px] font-bold"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}/{t("sett", "wk")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              goalReached
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : "bg-gradient-to-r from-primary to-violet-500"
            }`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      </div>
    </section>
  );
}

interface StreakResult {
  current: number;
  record: number;
}

function computeStreak(completedAts: string[]): StreakResult {
  if (completedAts.length === 0) {
    return { current: 0, record: 0 };
  }

  // Set di giorni "yyyy-MM-dd" in cui c'è almeno una sessione completata.
  const days = new Set<string>();
  for (const iso of completedAts) {
    try {
      days.add(format(new Date(iso), "yyyy-MM-dd"));
    } catch {
      // data non valida, ignora
    }
  }

  // Streak corrente: includi "oggi" se presente, altrimenti parti da "ieri".
  // Se né oggi né ieri sono nel set, streak corrente = 0.
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");

  let cursor: Date | null = null;
  if (days.has(todayStr)) {
    cursor = today;
  } else if (days.has(yesterdayStr)) {
    cursor = subDays(today, 1);
  }

  let current = 0;
  while (cursor && days.has(format(cursor, "yyyy-MM-dd"))) {
    current++;
    cursor = subDays(cursor, 1);
  }

  // Record personale: scansione sorted days per max run consecutivo.
  const sorted = [...days].sort();
  let record = sorted.length > 0 ? 1 : 0;
  let run = sorted.length > 0 ? 1 : 0;
  let prev: Date | null = sorted.length > 0 ? new Date(sorted[0]) : null;
  for (let i = 1; i < sorted.length; i++) {
    const d = new Date(sorted[i]);
    if (prev && differenceInCalendarDays(d, prev) === 1) {
      run++;
    } else {
      run = 1;
    }
    if (run > record) record = run;
    prev = d;
  }

  return { current, record };
}
