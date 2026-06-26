import { createContext, useContext, useMemo, type ReactNode } from "react";

export type WeightUnit = "kg";

interface WeightUnitContextValue {
  unit: WeightUnit;
  /** Formatta un valore in kg. */
  display: (kg: number | null | undefined, opts?: { digits?: number }) => string;
  /** Converte kg → kg (no-op). */
  convertFromKg: (kg: number) => number;
  /** Converte valore immesso → kg (no-op). */
  convertToKg: (value: number) => number;
  isLoading: false;
}

const WeightUnitContext = createContext<WeightUnitContextValue | null>(null);

export function WeightUnitProvider({ children }: { children: ReactNode }) {
  const value = useMemo<WeightUnitContextValue>(() => {
    const display: WeightUnitContextValue["display"] = (kg, opts) => {
      if (kg == null || !Number.isFinite(kg)) return "—";
      const digits = opts?.digits ?? 1;
      const formatted =
        digits === 0
          ? Math.round(kg).toLocaleString("it-IT")
          : kg.toLocaleString("it-IT", {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
            });
      return `${formatted} Kg`;
    };
    return {
      unit: "kg",
      display,
      convertFromKg: (kg) => kg,
      convertToKg: (val) => val,
      isLoading: false,
    };
  }, []);

  return (
    <WeightUnitContext.Provider value={value}>
      {children}
    </WeightUnitContext.Provider>
  );
}

export function useWeightUnit(): WeightUnitContextValue {
  const v = useContext(WeightUnitContext);
  if (!v) {
    throw new Error("useWeightUnit must be used inside a <WeightUnitProvider>");
  }
  return v;
}
