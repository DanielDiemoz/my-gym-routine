import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useLanguage } from "@/lib/i18n";
import { MUSCLE_EN } from "@/lib/muscleColors";

export interface ExerciseLibraryEntry {
  id: string;
  name: string;
  muscle_group: string;
}

interface Props {
  /** Valore corrente del campo (controllato dal parent). */
  value: string;
  /** Callback su cambio input. */
  onChange: (next: string) => void;
  /** Callback quando l'utente seleziona un suggerimento. */
  onPick?: (entry: ExerciseLibraryEntry) => void;
  /** Callback blur (per il parent). */
  onBlur?: () => void;
  /** Placeholder dell'input. */
  placeholder?: string;
}

/**
 * cmdk-based autocomplete per la libreria esercizi GymBro.
 * - Debounce 300ms sulle query Supabase.
 * - Match ILIKE sul nome (case-insensitive, italian).
 * - Selezione → callback onPick + popolamento parent.
 * - L'utente può scrivere un nome custom (nessun blocco).
 * - Stile shadcn Card (`bg-card border border-border rounded-2xl`).
 */
export function ExerciseAutocomplete({
  value,
  onChange,
  onPick,
  onBlur,
  placeholder,
}: Props) {
  const { t } = useLanguage();
  const [debounced, setDebounced] = useState(value.trim());
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce manuale (300ms) per evitare query ad ogni keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const v = value.trim();
    if (v.length === 0) {
      setDebounced("");
      return;
    }
    debounceRef.current = setTimeout(() => setDebounced(v), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const query = useQuery({
    queryKey: ["exercise-library", debounced.toLowerCase()],
    enabled: debounced.length >= 2,
    queryFn: async (): Promise<ExerciseLibraryEntry[]> => {
      const pattern = `%${debounced}%`;
      const { data, error } = await supabase
        .from("exercise_library")
        .select("id, name, muscle_group")
        .ilike("name", pattern)
        .order("name", { ascending: true })
        .limit(8);
      if (error) {
        // eslint-disable-next-line no-console
        console.warn("[ExerciseAutocomplete]", error.message);
        return [];
      }
      return (data ?? []) as ExerciseLibraryEntry[];
    },
    staleTime: 1000 * 60 * 2,
  });

  // Apri dropdown solo se l'utente sta editando e ci sono caratteri.
  useEffect(() => {
    setOpen(value.trim().length >= 2);
  }, [value]);

  const results = useMemo(() => query.data ?? [], [query.data]);

  return (
    <div className="relative">
      <Command
        shouldFilter={false}
        className="overflow-visible rounded-2xl border border-border bg-card"
      >
        <CommandInput
          value={value}
          onValueChange={(v) => onChange(v)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // piccolo delay per permettere click su CommandItem
            setTimeout(() => setOpen(false), 120);
            onBlur?.();
          }}
          placeholder={placeholder ?? "Cerca esercizio..."}
          className="rounded-2xl border-transparent"
        />
        {open && (
          <CommandList className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 rounded-2xl border border-border bg-card shadow-lg">
            {query.isLoading ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Caricamento...
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty>
                {debounced.length < 2
                  ? "Digita almeno 2 caratteri"
                  : "Nessun risultato. Puoi scrivere un nome custom."}
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Libreria">
                {results.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={e.id}
                    onSelect={() => {
                      onChange(e.name);
                      onPick?.(e);
                      setOpen(false);
                    }}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium">{e.name}</span>
                      <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                        {t(e.muscle_group, MUSCLE_EN[e.muscle_group] ?? e.muscle_group)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  );
}
