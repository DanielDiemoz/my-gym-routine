import { describe, it, expect, vi } from "vitest";
import { muscleColor, muscleEn, MUSCLE_COLORS, MUSCLE_EN } from "@/lib/muscleColors";

describe("muscleColor", () => {
  it("restituisce il colore per un gruppo muscolare valido", () => {
    expect(muscleColor("Petto")).toBe(MUSCLE_COLORS.Petto);
    expect(muscleColor("Gambe")).toBe(MUSCLE_COLORS.Gambe);
    expect(muscleColor("Spalle")).toBe(MUSCLE_COLORS.Spalle);
  });

  it("restituisce Altro per gruppo null/undefined", () => {
    expect(muscleColor(null)).toBe(MUSCLE_COLORS.Altro);
    expect(muscleColor(undefined)).toBe(MUSCLE_COLORS.Altro);
  });

  it("restituisce Altro per gruppo non riconosciuto", () => {
    expect(muscleColor("Inesistente")).toBe(MUSCLE_COLORS.Altro);
  });

  it("trimma whitespace", () => {
    expect(muscleColor("  Petto  ")).toBe(MUSCLE_COLORS.Petto);
  });

  it("gestisce stringa vuota", () => {
    expect(muscleColor("")).toBe(MUSCLE_COLORS.Altro);
  });
});

describe("muscleEn", () => {
  it("traduce gruppi comuni", () => {
    expect(muscleEn("Petto")).toBe("Chest");
    expect(muscleEn("Schiena")).toBe("Back");
    expect(muscleEn("Gambe")).toBe("Legs");
    expect(muscleEn("Spalle")).toBe("Shoulders");
    expect(muscleEn("Bicipiti")).toBe("Biceps");
    expect(muscleEn("Tricipiti")).toBe("Triceps");
  });

  it("gestisce sinonimi", () => {
    expect(muscleEn("Dorsali")).toBe("Back");
    expect(muscleEn("Quadricipiti")).toBe("Quads");
    expect(muscleEn("Femorali")).toBe("Hamstrings");
    expect(muscleEn("Polpacci")).toBe("Calves");
  });

  it("restituisce la stringa originale per gruppo sconosciuto", () => {
    expect(muscleEn("MioGruppo")).toBe("MioGruppo");
  });

  it("restituisce stringa vuota per null/undefined", () => {
    expect(muscleEn(null)).toBe("");
    expect(muscleEn(undefined)).toBe("");
  });

  it("trimma whitespace", () => {
    expect(muscleEn("  Petto  ")).toBe("Chest");
  });
});
