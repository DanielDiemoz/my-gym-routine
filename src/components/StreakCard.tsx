import { Flame, Trophy, Target } from "lucide-react";
import {
  differenceInCalendarDays,
  format,
  subDays,
} from "date-fns";
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
export function StreakCard({
  sessions,
  weeklyGoal,
  weeklyCount,
  onChangeGoal,
  isLoading,
}: Props) {
  const { t } = useLanguage();
  const safeWeeklyGoal = Math.max(1, Math.min(7, weeklyGoal || 3));
  const completedAts = sessions
    .map((s) => s.completed_at)
    .filter((v): v is string => !!v);
  const { current, record } = computeStreak(completedAts);
  const ratio = Math.min(weeklyCount / safeWeeklyGoal, 1);
  const goalReached = weeklyCount >= safeWeeklyGoal;

  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("Streak", "Streak")}
        </h3>
        <Flame className={`h-4 w-4 ${current > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-black tracking-tight">
          {isLoading ? "—" : current}
        </span>
        <span className="text-sm text-muted-foreground">
          {current === 1 ? t("giorno", "day") : t("giorni", "days")}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Trophy className="h-3 w-3" />
         <span>
          {t("Record", "Record")}: <span className="font-semibold text-foreground">{isLoading ? "—" : record}</span>
        </span>
      </div>

      {/* Helper se lo streak è rotto ma esiste un record passato. */}
      {!isLoading && current === 0 && record > 0 && (
        <p className="mt-2 text-xs italic text-muted-foreground">
          {t("Allena oggi per ricostruire lo streak.", "Train today to rebuild your streak.")}
        </p>
      )}
      {!isLoading && current > 0 && current === record && (
        <p className="mt-2 text-xs font-semibold text-[oklch(0.55_0.16_145)]">
          🏆 {t("Nuovo record!", "New record!")}
        </p>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Target className="h-3 w-3" /> {t("Questa settimana", "This week")}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold ${goalReached ? "text-[oklch(0.55_0.16_145)]" : "text-foreground"}`}
            >
              {weeklyCount}/{safeWeeklyGoal}
            </span>
            <Select
              value={String(safeWeeklyGoal)}
              onValueChange={(v) => onChangeGoal(Number(v))}
            >
              <SelectTrigger
                aria-label={t("Obiettivo settimanale", "Weekly goal")}
                className="h-7 w-auto rounded-full border px-2 text-xs font-semibold"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}/sett
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
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
