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
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="rounded-full p-1.5 text-muted-foreground active:scale-95"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="text-sm font-bold capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {monthWorkoutCount} {monthWorkoutCount === 1 ? t("allenamento", "workout") : t("allenamenti", "workouts")}
          </div>
        </div>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="rounded-full p-1.5 text-muted-foreground active:scale-95"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDayLabels.map((label) => (
          <div key={label} className="py-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">
            {label}
          </div>
        ))}

        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth);
          const key = format(day, "yyyy-MM-dd");
          const hasWorkout = workoutDaySet.has(key);

          return (
            <div
              key={key}
              className={`flex h-8 items-center justify-center rounded-lg text-xs ${
                !inMonth
                  ? "text-muted-foreground/30"
                  : hasWorkout
                    ? "bg-primary font-bold text-primary-foreground"
                    : "text-muted-foreground"
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
