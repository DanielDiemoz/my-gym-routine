import { MuscleMap } from "@musclemap/react";
import type { MuscleMapValues } from "@musclemap/core";
import { MAIN_TO_MUSCLEMAP, toMuscleMapScore } from "@/lib/muscleMapping";
import type { MuscleStimulusData, StimulusMetric } from "@/hooks/useMuscleStimulusData";

type BodyMapProps = {
  data: MuscleStimulusData;
  metric: StimulusMetric;
};

export function BodyMap({ data, metric }: BodyMapProps) {
  const values: MuscleMapValues = {};

  for (const muscle of data.muscles) {
    const muscleGroups = MAIN_TO_MUSCLEMAP[muscle.group] ?? [];
    const rawValue = metric === "volume" ? muscle.volume : muscle.sets;
    const score = toMuscleMapScore(rawValue, data.thresholds);

    if (score === 0) continue;

    for (const group of muscleGroups) {
      values[group] = {
        score,
        volumeKg: metric === "volume" ? muscle.volume : undefined,
        sets: metric === "sets" ? muscle.sets : undefined,
      };
    }
  }

  return (
    <div className="flex flex-col items-center">
      <MuscleMap
        values={values}
        view="BOTH"
        sex="MALE"
        monochromeColor="#7c3aed"
        glow={true}
        showLegend={true}
        figureWidth={200}
      />
    </div>
  );
}
