import { useMemo } from "react";
import { format, startOfYear, endOfYear, eachDayOfInterval, getMonth, getDay } from "date-fns";
import { useLanguage } from "@/lib/i18n";
import type { HeatmapDay, HeatmapYear } from "@/hooks/useHeatmapData";

type WorkoutHeatmapProps = {
  years: HeatmapYear[];
  thresholds: [number, number, number];
};

const LEVEL_CLASSES = ["bg-muted", "bg-orange-300", "bg-orange-400", "bg-orange-600"];

function getLevel(volume: number, thresholds: [number, number, number]): number {
  if (volume <= 0) return 0;
  if (volume <= thresholds[0]) return 1;
  if (volume <= thresholds[1]) return 2;
  return 3;
}

const MONTH_LABELS = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
];
const WEEKDAY_LABELS = ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"];

function YearHeatmap({
  yearData,
  thresholds,
  t,
}: {
  yearData: HeatmapYear;
  thresholds: [number, number, number];
  t: (it: string, en: string) => string;
}) {
  const yearDate = new Date(yearData.year, 0, 1);
  const yearStart = startOfYear(yearDate);
  const yearEnd = endOfYear(yearDate);

  const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });

  const dayMap = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    for (const d of yearData.days) {
      map.set(d.date, d);
    }
    return map;
  }, [yearData.days]);

  // Build grid: rows = 7 (weekdays), always 53 cols
  const weeks = useMemo(() => {
    const result: (HeatmapDay | null)[][] = [];
    let currentWeek: (HeatmapDay | null)[] = [];

    // Always start the first week with padding for days before Jan 1
    const firstDow = (getDay(yearStart) + 6) % 7; // 0=Mon, 6=Sun
    for (let i = 0; i < firstDow; i++) {
      currentWeek.push(null);
    }

    for (const day of allDays) {
      const dayOfWeek = (getDay(day) + 6) % 7;
      const dateKey = format(day, "yyyy-MM-dd");
      const data = dayMap.get(dateKey) ?? { date: dateKey, volume: 0, count: 0 };

      currentWeek.push(data);

      if (dayOfWeek === 6) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }

    // Always pad last week to 7 cells for consistent 53-column grid
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      result.push(currentWeek);
    }

    return result;
  }, [allDays, dayMap, yearStart]);

  // Month label positions: find the first week of each month
  const monthPositions = useMemo(() => {
    const positions: { month: number; col: number }[] = [];
    let lastMonth = -1;

    for (let col = 0; col < weeks.length; col++) {
      for (const day of weeks[col]) {
        if (day) {
          const m = getMonth(new Date(day.date));
          if (m !== lastMonth) {
            positions.push({ month: m, col });
            lastMonth = m;
          }
          break;
        }
      }
    }

    return positions;
  }, [weeks]);

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-xl font-black tracking-tight">{yearData.year}</h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {yearData.totalCount}{" "}
          {yearData.totalCount === 1 ? t("allenamento", "workout") : t("allenamenti", "workouts")}
        </span>
      </div>

      {/* Month labels */}
      <div className="mb-1 flex pl-6">
        {monthPositions.map(({ month, col }) => (
          <div
            key={month}
            className="text-[8px] text-muted-foreground"
            style={{
              position: "relative",
              left: `${col * 9}px`,
              width: 0,
            }}
          >
            {MONTH_LABELS[month]}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex gap-1">
        {/* Weekday labels */}
        <div className="flex flex-col gap-[2px] pr-1 pt-0">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={label} className="flex h-[7px] items-center text-[7px] text-muted-foreground">
              {i % 2 === 1 ? label : ""}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="flex gap-[2px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((day, di) => {
                if (!day) {
                  return <div key={di} className="h-[7px] w-[7px]" />;
                }
                const level = getLevel(day.volume, thresholds);
                return (
                  <div
                    key={di}
                    title={`${day.date}: ${day.volume.toFixed(0)} kg`}
                    className={`h-[7px] w-[7px] rounded-sm ${LEVEL_CLASSES[level]}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WorkoutHeatmap({ years, thresholds }: WorkoutHeatmapProps) {
  const { t } = useLanguage();

  return (
    <div>
      {years.map((yearData) => (
        <YearHeatmap key={yearData.year} yearData={yearData} thresholds={thresholds} t={t} />
      ))}

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-1.5">
        <span className="text-[8px] text-muted-foreground">{t("Meno", "Less")}</span>
        {LEVEL_CLASSES.map((cls, i) => (
          <div key={i} className={`h-[7px] w-[7px] rounded-sm ${cls}`} />
        ))}
        <span className="text-[8px] text-muted-foreground">{t("Più", "More")}</span>
      </div>
    </div>
  );
}
