import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, X, Trash2, Plus, Loader2, ImageIcon, Check, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { muscleColor, MUSCLE_EN } from "@/lib/muscleColors";
import { useLanguage } from "@/lib/i18n";
import { analyzeScheda, type AnalyzeSchedaResult } from "@/server-functions/analyze-scheda";

type Exercise = AnalyzeSchedaResult["exercises"][number];

type Props = {
  userId: string;
  onClose: () => void;
  onSaved: (planId: string) => void;
};

type Step = "upload" | "loading" | "preview";

const MUSCLES: [string, string][] = [
  ["Petto", "Chest"],
  ["Schiena", "Back"],
  ["Gambe", "Legs"],
  ["Spalle", "Shoulders"],
  ["Braccia", "Arms"],
  ["Core", "Core"],
  ["Glutei", "Glutes"],
  ["Altro", "Other"],
];

export function ScanPreviewDialog({ userId, onClose, onSaved }: Props) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [planName, setPlanName] = useState("Scheda importata");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setStep("loading");

      const base64 = dataUrl.split(",")[1];
      try {
        const result = await analyzeScheda({
          data: { imageBase64: base64, mimeType: file.type },
        });
        setPlanName(result.plan_name);
        setExercises(result.exercises);
        setStep("preview");
      } catch (err) {
        console.error(err);
        toast.error(
          t("Errore nell'analisi della foto. Riprova.", "Error analyzing the photo. Try again."),
        );
        setStep("upload");
        setPreview(null);
      }
    };
    reader.readAsDataURL(file);
  }

  function updateExercise(idx: number, patch: Partial<Exercise>) {
    setExercises((prev) => prev.map((ex, i) => (i === idx ? { ...ex, ...patch } : ex)));
  }

  function removeExercise(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      { name: "", muscle_group: "Petto", sets: 3, reps: 10, weight: 0, notes: null },
    ]);
  }

  async function save() {
    if (!planName.trim()) {
      toast.error(t("Inserisci il nome della scheda", "Enter the plan name"));
      return;
    }
    if (exercises.length === 0) {
      toast.error(t("Aggiungi almeno un esercizio", "Add at least one exercise"));
      return;
    }

    setSaving(true);
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .insert({ user_id: userId, name: planName.trim() })
      .select("id")
      .single();

    if (planErr) {
      toast.error(planErr.message);
      setSaving(false);
      return;
    }

    const rows = exercises.map((ex, i) => ({
      plan_id: plan.id,
      user_id: userId,
      name: ex.name || "Esercizio sconosciuto",
      muscle_group: ex.muscle_group,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      notes: ex.notes,
      position: i,
    }));

    const { error: exErr } = await supabase.from("exercises").insert(rows);
    if (exErr) {
      toast.error(exErr.message);
      setSaving(false);
      return;
    }

    toast.success(t("Scheda creata!", "Plan created!"));
    onSaved(plan.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl bg-background sm:rounded-3xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-4 py-3">
          {step === "preview" ? (
            <button onClick={() => setStep("upload")} className="p-1">
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : step === "loading" ? null : (
            <button onClick={onClose} className="p-1">
              <X className="h-5 w-5" />
            </button>
          )}
          <h3 className="flex-1 text-center text-lg font-bold">
            {step === "upload"
              ? t("Importa da foto", "Import from photo")
              : step === "loading"
                ? t("Analisi in corso...", "Analyzing...")
                : t("Anteprima scheda", "Plan preview")}
          </h3>
          {step === "preview" && (
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {saving ? "..." : t("Salva", "Save")}
            </button>
          )}
          {step === "loading" && <div className="w-[52px]" />}
        </div>

        {/* Content */}
        <div className="p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          {step === "upload" && (
            <div className="space-y-3">
              {preview && (
                <img
                  src={preview}
                  alt="Anteprima"
                  className="w-full rounded-2xl object-contain"
                  style={{ maxHeight: 300 }}
                />
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border py-10 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Camera className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">
                    {t("Scatta foto o carica immagine", "Take photo or upload image")}
                  </p>
                  <p className="mt-1 text-xs">
                    {t(
                      "La foto viene analizzata dall'AI per creare la scheda",
                      "The photo is analyzed by AI to create the plan",
                    )}
                  </p>
                </div>
              </button>
            </div>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-16">
              {preview && (
                <img
                  src={preview}
                  alt="Analisi"
                  className="w-40 rounded-xl object-contain opacity-50"
                />
              )}
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("Analisi della scheda in corso...", "Analyzing the workout plan...")}
              </p>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("Nome scheda", "Plan name")}
                </label>
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none focus:border-foreground"
                />
              </div>

              <div className="space-y-2">
                {exercises.map((ex, idx) => (
                  <ExercisePreviewRow
                    key={idx}
                    exercise={ex}
                    onChange={(patch) => updateExercise(idx, patch)}
                    onRemove={() => removeExercise(idx)}
                  />
                ))}
              </div>

              <button
                onClick={addExercise}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-3 text-sm font-semibold text-muted-foreground"
              >
                <Plus className="h-4 w-4" /> {t("Aggiungi esercizio", "Add exercise")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExercisePreviewRow({
  exercise,
  onChange,
  onRemove,
}: {
  exercise: Exercise;
  onChange: (patch: Partial<Exercise>) => void;
  onRemove: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <input
            value={exercise.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t("Nome esercizio", "Exercise name")}
            className="w-full bg-transparent text-sm font-semibold outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {MUSCLES.map(([value, en]) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ muscle_group: value })}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  exercise.muscle_group === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: muscleColor(value) }}
                />
                {t(value, en)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniNumInput
              label={t("Serie", "Sets")}
              value={exercise.sets}
              onChange={(v) => onChange({ sets: v })}
            />
            <MiniNumInput
              label={t("Rip.", "Reps")}
              value={exercise.reps}
              onChange={(v) => onChange({ reps: v })}
            />
            <MiniNumInput
              label="Kg"
              value={exercise.weight}
              onChange={(v) => onChange({ weight: v })}
              step={0.5}
            />
          </div>
        </div>
        <button onClick={onRemove} className="p-1.5 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MiniNumInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={0}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.max(0, n));
        }}
        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-foreground"
      />
    </div>
  );
}
