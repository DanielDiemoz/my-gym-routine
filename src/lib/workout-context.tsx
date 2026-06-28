import { createContext, useContext, useState, type ReactNode } from "react";

type WorkoutStash = {
  data: string | null;
  setData: (data: string | null) => void;
};

const WorkoutContext = createContext<WorkoutStash>({
  data: null,
  setData: () => {},
});

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<string | null>(null);
  return (
    <WorkoutContext.Provider value={{ data, setData }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkoutStash() {
  return useContext(WorkoutContext);
}
