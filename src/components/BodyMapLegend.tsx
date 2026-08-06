import { MONOCHROMATIC_COLORS } from "@/lib/muscleMapping";
import type { MuscleStimulusValue, StimulusMetric } from "@/hooks/useMuscleStimulusData";
import { useLanguage } from "@/lib/i18n";

type BodyMapLegendProps = {
  muscles: MuscleStimulusValue[];
  metric: StimulusMetric;
};

const INTENSITY_LEVELS = [
  { label: "Nessuno", labelEn: "None", fill: "#3f3f3f" },
  { label: "Basso", labelEn: "Low", fill: MONOCHROMATIC_COLORS[0] },
  { label: "Medio", labelEn: "Medium", fill: MONOCHROMATIC_COLORS[1] },
  { label: "Alto", labelEn: "High", fill: MONOCHROMATIC_COLORS[2] },
  { label: "Molto alto", labelEn: "Very high", fill: MONOCHROMATIC_COLORS[3] },
  { label: "Massimo", labelEn: "Max", fill: MONOCHROMATIC_COLORS[4] },
];

export function BodyMapLegend({ muscles, metric }: BodyMapLegendProps) {
  const { t } = useLanguage();
  const muscleMap = new Map(muscles.map((m) => [m.group, m]));

  const formatValue = (value: number) =>
    metric === "volume" ? `${value.toLocaleString("it-IT")} kg` : `${value} serie`;

  const GROUPS_ORDER = [
    "Petto",
    "Schiena",
    "Spalle",
    "Braccia",
    "Bicipiti",
    "Tricipiti",
    "Avambracci",
    "Addome",
    "Gambe",
    "Glutei",
  ];

  return (
    <div className="mt-6 space-y-5">
      {/* Intensity scale */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("Intensità", "Intensity")}
        </h3>
        <div className="flex items-center gap-1">
          {INTENSITY_LEVELS.map((level) => (
            <div key={level.label} className="flex flex-col items-center">
              <div className="h-5 w-7 rounded-sm sm:w-8" style={{ backgroundColor: level.fill }} />
              <span className="mt-0.5 text-[8px] text-muted-foreground sm:text-[10px]">
                {t(level.label, level.labelEn)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Muscle groups breakdown */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("Dettaglio per gruppo", "Detail per group")}
        </h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {GROUPS_ORDER.map((group) => {
            const muscle = muscleMap.get(group);
            const value = metric === "volume" ? (muscle?.volume ?? 0) : (muscle?.sets ?? 0);
            return (
              <div
                key={group}
                className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2.5"
              >
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor: value > 0 ? MONOCHROMATIC_COLORS[3] : "#3f3f3f",
                  }}
                />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{group}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {value > 0 ? formatValue(value) : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
