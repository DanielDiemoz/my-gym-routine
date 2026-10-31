import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type WorkoutCalendarProps = {
  workoutDays: Date[];
};

export function WorkoutCalendar({ workoutDays }: WorkoutCalendarProps) {
  const { t, dateLocale } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const workoutDaySet = useMemo(() => {
    const set = new Set<string>();
    for (const d of workoutDays) {
      set.add(format(d, "yyyy-MM-dd"));
    }
    return set;
  }, [workoutDays]);

  const monthWorkoutCount = useMemo(() => {
    return workoutDays.filter((d) => isSameMonth(d, currentMonth)).length;
  }, [workoutDays, currentMonth]);

  const weekDayLabels = ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"];
  const today = new Date();

  return (
    <div className="bento-card rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition hover:text-foreground active:scale-95"
          aria-label={t("Mese precedente", "Previous month")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold capitalize">
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
            {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">
            {monthWorkoutCount}{" "}
            {monthWorkoutCount === 1 ? t("allenamento", "workout") : t("allenamenti", "workouts")}
          </div>
        </div>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition hover:text-foreground active:scale-95"
          aria-label={t("Mese successivo", "Next month")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {weekDayLabels.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            {label}
          </div>
        ))}

        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth);
          const key = format(day, "yyyy-MM-dd");
          const hasWorkout = workoutDaySet.has(key);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={key}
              className={`flex h-9 items-center justify-center rounded-xl text-xs tabular-nums transition-colors ${
                !inMonth
                  ? "text-muted-foreground/25"
                  : hasWorkout
                    ? "bg-primary font-extrabold text-primary-foreground shadow-xs"
                    : isToday
                      ? "bg-primary/10 font-bold text-primary ring-1 ring-primary/40"
                      : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );
}
