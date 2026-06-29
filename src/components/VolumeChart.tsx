import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export interface WeeklyVolumeBar {
  week: string;
  range: string;
  volume: number;
  /** Calorie stimate per la settimana. */
  calories: number;
}

interface Props {
  data: WeeklyVolumeBar[];
}

export function VolumeChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">
          Completa qualche allenamento per vedere il grafico.
        </p>
      </div>
    );
  }

  return (
    <div
      className="h-48 w-full"
      role="img"
      aria-label={`Grafico delle calorie settimanali, ultimi ${data.length} periodi.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="week"
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            content={<VolumeTooltip />}
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          />
          <Bar dataKey="calories" fill="var(--primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function VolumeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: WeeklyVolumeBar }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-bold">{item.range}</p>
      <p className="text-foreground">{item.calories.toLocaleString("it-IT")} kcal</p>
      <p className="text-muted-foreground">{Math.round(item.volume).toLocaleString("it-IT")} Kg volume</p>
    </div>
  );
}
