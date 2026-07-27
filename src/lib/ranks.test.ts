import { describe, it, expect, vi } from "vitest";

vi.mock("@/assets/ranks/recluta.webp", () => ({ default: "recluta.webp" }));
vi.mock("@/assets/ranks/atleta.webp", () => ({ default: "atleta.webp" }));
vi.mock("@/assets/ranks/guerriero.webp", () => ({ default: "guerriero.webp" }));
vi.mock("@/assets/ranks/campione.webp", () => ({ default: "campione.webp" }));
vi.mock("@/assets/ranks/maestro.webp", () => ({ default: "maestro.webp" }));
vi.mock("@/assets/ranks/leggenda.webp", () => ({ default: "leggenda.webp" }));

import { getRank, rankName, nextRankName, RANK_TIERS } from "@/lib/ranks";

describe("getRank", () => {
  it("0 allenamenti → Recluta", () => {
    const r = getRank(0);
    expect(r.tier.name[0]).toBe("Recluta");
    expect(r.tier.level).toBe(0);
    expect(r.totalWorkouts).toBe(0);
    expect(r.progress).toBe(0);
  });

  it("10 allenamenti → Atleta", () => {
    const r = getRank(10);
    expect(r.tier.name[0]).toBe("Atleta");
    expect(r.tier.level).toBe(1);
    expect(r.workoutsToNext).toBe(15);
    expect(r.progress).toBe(0);
  });

  it("15 allenamenti → Atleta con progresso 33%", () => {
    const r = getRank(15);
    expect(r.tier.name[0]).toBe("Atleta");
    expect(r.workoutsToNext).toBe(10);
    expect(r.progress).toBeCloseTo(1 / 3, 2);
  });

  it("25 allenamenti → Guerriero", () => {
    const r = getRank(25);
    expect(r.tier.name[0]).toBe("Guerriero");
    expect(r.tier.level).toBe(2);
  });

  it("50 allenamenti → Campione", () => {
    expect(getRank(50).tier.name[0]).toBe("Campione");
  });

  it("100 allenamenti → Maestro", () => {
    expect(getRank(100).tier.name[0]).toBe("Maestro");
  });

  it("200+ allenamenti → Leggenda", () => {
    const r = getRank(200);
    expect(r.tier.name[0]).toBe("Leggenda");
    expect(r.tier.level).toBe(5);
    expect(r.workoutsToNext).toBe(0);
    expect(r.progress).toBe(1);
    expect(r.nextThreshold).toBeNull();
  });

  it("300 allenamenti → sempre Leggenda", () => {
    expect(getRank(300).tier.name[0]).toBe("Leggenda");
  });

  it("negativi trattati come 0", () => {
    const r = getRank(-5);
    expect(r.tier.name[0]).toBe("Recluta");
    expect(r.totalWorkouts).toBe(0);
  });

  it("truncates float a intero", () => {
    const r = getRank(9.7);
    expect(r.totalWorkouts).toBe(9);
    expect(r.tier.name[0]).toBe("Recluta");
  });
});

describe("rankName", () => {
  it("italiano", () => {
    expect(rankName(RANK_TIERS[0], "it")).toBe("Recluta");
    expect(rankName(RANK_TIERS[5], "it")).toBe("Leggenda");
  });

  it("inglese", () => {
    expect(rankName(RANK_TIERS[0], "en")).toBe("Recruit");
    expect(rankName(RANK_TIERS[5], "en")).toBe("Legend");
  });
});

describe("nextRankName", () => {
  it("restituisce il rank successivo", () => {
    expect(nextRankName(0, "it")).toBe("Atleta");
    expect(nextRankName(4, "it")).toBe("Leggenda");
  });

  it("null se è lultimo", () => {
    expect(nextRankName(5, "it")).toBeNull();
    expect(nextRankName(5, "en")).toBeNull();
  });

  it("inglese", () => {
    expect(nextRankName(0, "en")).toBe("Athlete");
  });
});
