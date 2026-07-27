import { describe, it, expect, vi } from "vitest";
import { computePRs, isNewPR, type ExercisePR } from "@/hooks/usePersonalRecords";

const mockLogs = [
  { exercise_name: "Panca piana", weight: 80, reps: 8, created_at: "2024-01-15T10:00:00Z" },
  { exercise_name: "Panca piana", weight: 85, reps: 5, created_at: "2024-01-20T10:00:00Z" },
  { exercise_name: "Panca piana", weight: 75, reps: 10, created_at: "2024-01-10T10:00:00Z" },
  { exercise_name: "Squat", weight: 120, reps: 5, created_at: "2024-01-18T10:00:00Z" },
  { exercise_name: "Squat", weight: 110, reps: 8, created_at: "2024-01-12T10:00:00Z" },
  { exercise_name: "Stacco", weight: 140, reps: 3, created_at: "2024-01-22T10:00:00Z" },
];

describe("computePRs", () => {
  it("calcola max weight per esercizio", () => {
    const prs = computePRs(mockLogs);
    const panca = prs.find((p) => p.exercise === "Panca piana");
    expect(panca?.maxWeight).toBe(85);
  });

  it("ordina PR per max weight desc", () => {
    const prs = computePRs(mockLogs);
    expect(prs[0].exercise).toBe("Stacco");
    expect(prs[1].exercise).toBe("Squat");
    expect(prs[2].exercise).toBe("Panca piana");
  });

  it("calcola 1RM stimato con formula Epley (prende il max tra tutte le serie valide)", () => {
    const prs = computePRs(mockLogs);
    const panca = prs.find((p) => p.exercise === "Panca piana");
    const squat = prs.find((p) => p.exercise === "Squat");
    // Panca: max weight 85x5=99, ma 80x8=101, 75x10=100 -> max 1RM = 101
    expect(panca?.estimated1RM).toBe(101);
    // Squat: 120x5=140, 110x8=139 -> max 1RM = 140
    expect(squat?.estimated1RM).toBe(140);
  });

  it("ignora serie con reps > 10 per 1RM (baseline = maxWeight)", () => {
    const logs = [
      { exercise_name: "Test", weight: 100, reps: 12, created_at: "2024-01-01T00:00:00Z" },
      { exercise_name: "Test", weight: 80, reps: 5, created_at: "2024-01-02T00:00:00Z" },
    ];
    const prs = computePRs(logs);
    // 80*5 -> 1RM = 93, ma baseline = maxWeight = 100 > 93 → resta 100
    expect(prs[0].estimated1RM).toBe(100);
  });

  it("restituisce history ultimi 5 pesi unici per data desc", () => {
    const logs = Array.from({ length: 10 }, (_, i) => ({
      exercise_name: "Test",
      weight: 50 + i,
      reps: 5,
      created_at: `2024-01-${String(i + 1).padStart(2, "0")}T10:00:00Z`,
    }));
    const prs = computePRs(logs);
    expect(prs[0].history.length).toBe(5);
    expect(prs[0].history[0].weight).toBe(59);
    expect(prs[0].history[4].weight).toBe(55);
  });

  it("gestisce esercizio senza logs", () => {
    const prs = computePRs([]);
    expect(prs).toEqual([]);
  });

  it("trim nome esercizio e ignora vuoti", () => {
    const logs = [
      { exercise_name: "  Panca  ", weight: 80, reps: 5, created_at: "2024-01-01T00:00:00Z" },
      { exercise_name: "", weight: 100, reps: 5, created_at: "2024-01-02T00:00:00Z" },
    ];
    const prs = computePRs(logs);
    expect(prs[0].exercise).toBe("Panca");
    expect(prs.length).toBe(1);
  });
});

describe("isNewPR", () => {
  const currentPRs: ExercisePR[] = [
    {
      exercise: "Panca piana",
      maxWeight: 85,
      date: "2024-01-20T10:00:00Z",
      estimated1RM: 100,
      totalSets: 10,
      history: [],
    },
    {
      exercise: "Squat",
      maxWeight: 120,
      date: "2024-01-18T10:00:00Z",
      estimated1RM: 140,
      totalSets: 8,
      history: [],
    },
  ];

  it("rileva nuovo PR peso maggiore", () => {
    const result = isNewPR("Panca piana", 90, currentPRs);
    expect(result.isNew).toBe(true);
    expect(result.oldPR).toBe(85);
  });

  it("non rileva PR se peso uguale o minore", () => {
    expect(isNewPR("Panca piana", 85, currentPRs).isNew).toBe(false);
    expect(isNewPR("Panca piana", 80, currentPRs).isNew).toBe(false);
  });

  it("primo log è sempre PR", () => {
    const result = isNewPR("Nuovo esercizio", 50, currentPRs);
    expect(result.isNew).toBe(true);
    expect(result.oldPR).toBe(0);
  });

  it("case insensitive match", () => {
    expect(isNewPR("PANCA PIANA", 90, currentPRs).isNew).toBe(true);
    expect(isNewPR("panca piana", 90, currentPRs).isNew).toBe(true);
  });
});
