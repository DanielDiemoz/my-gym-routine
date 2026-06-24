import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

/** Mappa `yyyy-MM-dd` -> volume totale in kg per quel giorno. */
export type SessionsByDay = Map<string, number>;

interface Props {
  sessionsByDay: SessionsByDay;
  /** Unita di misura corrente (per leggenda "Meno | Più"). Default: kg. */
  unit?: "kg" | "lbs";
}

/**
 * Heat-map annuale (ultimi 365 giorni) per GymBro.
 * - Usa `react-day-picker` v9 in modalità visualizzazione (mode="single" con onSelect no-op).
 * - Tre bucket (lowVolume / medVolume / highVolume) basati sul rapporto volume/max.
 * - Opacity 30% / 60% / 100% via modifiersStyles.
 */
export function YearHeatMap({ sessionsByDay, unit = "kg" }: Props) {
  const max = sessionsByDay.size > 0 ? Math.max(...sessionsByDay.values()) : 0;

  const low: Date[] = [];
  const med: Date[] = [];
  const high: Date[] = [];

  sessionsByDay.forEach((volume, dayStr) => {
    const d = new Date(`${dayStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return;
    if (max === 0) {
      low.push(d);
      return;
    }
    const ratio = volume / max;
    if (ratio < 0.33) low.push(d);
    else if (ratio < 0.66) med.push(d);
    else high.push(d);
  });

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <DayPicker
        mode="single"
        selected={undefined}
        onSelect={() => {
          /* visual-only: nessuna selezione */
        }}
        showOutsideDays
        modifiers={{
          lowVolume: low,
          medVolume: med,
          highVolume: high,
        }}
        modifiersStyles={{
          lowVolume: {
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            borderRadius: 6,
            opacity: 0.3,
          },
          medVolume: {
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            borderRadius: 6,
            opacity: 0.6,
          },
          highVolume: {
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            borderRadius: 6,
            opacity: 1,
          },
        }}
      />
      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Meno {unit}</span>
        <span
          aria-hidden
          className="h-3 w-3 rounded"
          style={{ backgroundColor: "var(--primary)", opacity: 0.3 }}
        />
        <span
          aria-hidden
          className="h-3 w-3 rounded"
          style={{ backgroundColor: "var(--primary)", opacity: 0.6 }}
        />
        <span
          aria-hidden
          className="h-3 w-3 rounded"
          style={{ backgroundColor: "var(--primary)", opacity: 1 }}
        />
        <span>Più {unit}</span>
      </div>
    </div>
  );
}
