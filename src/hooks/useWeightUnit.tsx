import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WeightUnit = "kg" | "lbs";

interface WeightUnitContextValue {
  unit: WeightUnit;
  /** Scrive la nuova unit su profiles + invalida la cache. */
  toggle: () => Promise<void>;
  /** Formatta un valore (kg nativi) nel unit corrente. */
  display: (kg: number | null | undefined, opts?: { digits?: number }) => string;
  /** Converte kg → unit corrente (numeric). */
  convertFromKg: (kg: number) => number;
  /** Converte valore immesso in unit corrente → kg (per il DB). */
  convertToKg: (value: number) => number;
  isLoading: boolean;
}

const KG_PER_LB = 0.45359243;
const LB_PER_KG = 2.2046226218;

const WeightUnitContext = createContext<WeightUnitContextValue | null>(null);

interface ProviderProps {
  userId: string;
  children: ReactNode;
}

export function WeightUnitProvider({ userId, children }: ProviderProps) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("weight_unit")
        .eq("id", userId)
        .maybeSingle();
      const raw = data?.weight_unit;
      return (raw === "lbs" ? "lbs" : "kg") as WeightUnit;
    },
    staleTime: 1000 * 60 * 5,
  });

  const toggle = useCallback(async () => {
    const current: WeightUnit = q.data ?? "kg";
    const next: WeightUnit = current === "kg" ? "lbs" : "kg";
    await supabase
      .from("profiles")
      .update({ weight_unit: next })
      .eq("id", userId);
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  }, [q.data, qc, userId]);

  const value = useMemo<WeightUnitContextValue>(() => {
    const unit: WeightUnit = q.data ?? "kg";
    const convertFromKg = (kg: number) => (unit === "kg" ? kg : kg * LB_PER_KG);
    const convertToKg = (val: number) => (unit === "kg" ? val : val * KG_PER_LB);
    const display: WeightUnitContextValue["display"] = (kg, opts) => {
      if (kg == null || !Number.isFinite(kg)) return "—";
      const digits = opts?.digits ?? (unit === "kg" ? 1 : 0);
      const converted = convertFromKg(kg);
      const formatted =
        digits === 0
          ? Math.round(converted).toLocaleString("it-IT")
          : converted.toLocaleString("it-IT", {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
            });
      const label = unit === "kg" ? "Kg" : unit;
      return `${formatted} ${label}`;
    };
    return {
      unit,
      toggle,
      display,
      convertFromKg,
      convertToKg,
      isLoading: q.isLoading,
    };
  }, [q.data, q.isLoading, toggle]);

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
