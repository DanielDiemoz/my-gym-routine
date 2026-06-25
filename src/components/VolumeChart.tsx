import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export interface WeeklyVolumeBar {
  /** Etichetta breve per asse X (es. "12 Mag" o "S1"). */
  week: string;
  /** Etichetta completa per il tooltip (range settimana). */
  range: string;
  /** Volume totale in kg (sempre kg nativo dal DB). */
  volume: number;
}

interface Props {
  data: WeeklyVolumeBar[];
  /**
   * Formatter opzionale per la label nel tooltip.
   * Default: kg-arrotondato (locale it-IT). Passa `display(value)` da
   * useWeightUnit() per mostrare il valore nell'unità scelta dall'utente.
   */
  formatter?: (kg: number) => string;
}

/**
 * BarChart del volume settimanale GymBro (ultimi ~3 mesi).
 * - Background trasparente
 * - Assi in `var(--muted-foreground)` via `tick.fill`
 * - Bar color: `var(--primary)`
 * - Tooltip card design-system (bg-card, border-border, rounded-xl)
 */
export function VolumeChart({ data, formatter }: Props) {
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
      aria-label={`Grafico del volume settimanale in chilogrammi, ultimi ${data.length} periodi.`}
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
            content={<VolumeTooltip formatter={formatter} />}
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          />
          <Bar dataKey="volume" fill="var(--primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function VolumeTooltip({
  active,
  payload,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ payload: WeeklyVolumeBar }>;
  formatter?: (kg: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const label = formatter
    ? formatter(item.volume)
    : `${Math.round(item.volume).toLocaleString("it-IT")} Kg`;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-bold">{item.range}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}
