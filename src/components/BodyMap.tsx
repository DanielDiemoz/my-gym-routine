import Body, { type ExtendedBodyPart } from "react-muscle-highlighter";
import { MAIN_TO_SLUGS, MONOCHROMATIC_COLORS } from "@/lib/muscleMapping";
import type { MuscleStimulusData, StimulusMetric } from "@/hooks/useMuscleStimulusData";

type BodyMapProps = {
  data: MuscleStimulusData;
  metric: StimulusMetric;
};

function getIntensityLevel(value: number, thresholds: [number, number, number, number]): number {
  if (value === 0) return 0;
  if (value <= thresholds[0]) return 1;
  if (value <= thresholds[1]) return 2;
  if (value <= thresholds[2]) return 3;
  if (value <= thresholds[3]) return 4;
  return 5;
}

export function BodyMap({ data, metric }: BodyMapProps) {
  const bodyData: ExtendedBodyPart[] = [];

  for (const muscle of data.muscles) {
    const slugs = MAIN_TO_SLUGS[muscle.group] ?? [];
    const rawValue = metric === "volume" ? muscle.volume : muscle.sets;
    const intensity = getIntensityLevel(rawValue, data.thresholds);

    if (intensity === 0) continue;

    for (const slug of slugs) {
      bodyData.push({ slug, intensity: Math.min(intensity, 5) });
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
      <div className="flex w-full max-w-[200px] flex-col items-center sm:max-w-none">
        <Body
          data={bodyData}
          side="front"
          gender="male"
          scale={1.4}
          colors={MONOCHROMATIC_COLORS}
          border="none"
          defaultFill="#3f3f3f"
        />
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Anteriore
        </span>
      </div>
      <div className="flex w-full max-w-[200px] flex-col items-center sm:max-w-none">
        <Body
          data={bodyData}
          side="back"
          gender="male"
          scale={1.4}
          colors={MONOCHROMATIC_COLORS}
          border="none"
          defaultFill="#3f3f3f"
        />
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Posteriore
        </span>
      </div>
    </div>
  );
}
