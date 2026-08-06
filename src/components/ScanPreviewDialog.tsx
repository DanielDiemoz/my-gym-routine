import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, X, Trash2, Plus, ChevronLeft, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { muscleColor } from "@/lib/muscleColors";
import { inferMuscleGroup } from "@/lib/inferMuscleGroup";
import { useLanguage } from "@/lib/i18n";
import { analyzeScheda, type AnalyzeSchedaResult } from "@/server-functions/analyze-scheda";

type Exercise = AnalyzeSchedaResult["exercises"][number];

type Props = {
  userId: string;
  onClose: () => void;
  onSaved: (planId: string) => void;
};

type Step = "upload" | "loading" | "preview";
type InputMode = "image" | "text";

const MUSCLES: [string, string][] = [
  ["Petto", "Chest"],
  ["Schiena", "Back"],
  ["Gambe", "Legs"],
  ["Spalle", "Shoulders"],
  ["Braccia", "Arms"],
  ["Bicipiti", "Biceps"],
  ["Tricipiti", "Triceps"],
  ["Avambracci", "Forearms"],
  ["Core", "Core"],
  ["Glutei", "Glutes"],
  ["Altro", "Other"],
];

export function ScanPreviewDialog({ userId, onClose, onSaved }: Props) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [inputMode, setInputMode] = useState<InputMode>("image");
  const [preview, setPreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [planName, setPlanName] = useState("Scheda importata");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [showExercises, setShowExercises] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setStep("loading");
    setScannedCount(0);
    setShowExercises(false);

    compressImage(file)
      .then(({ dataUrl, base64, mimeType }) => {
        setPreview(dataUrl);
        return analyzeScheda({ data: { mode: "image", imageBase64: base64, mimeType } });
      })
      .then((result) => {
        setPlanName(result.plan_name);
        // Inferisci il muscle_group se l'AI ha prodotto "Braccia"
        const processedExercises = result.exercises.map((ex) => ({
          ...ex,
          muscle_group:
            ex.muscle_group === "Braccia"
              ? (inferMuscleGroup(ex.name) ?? ex.muscle_group)
              : ex.muscle_group,
        }));
        setExercises(processedExercises);
        setScannedCount(processedExercises.length);
        setStep("preview");
        setTimeout(() => setShowExercises(true), 150);
      })
      .catch((err) => {
        console.error("[ScanPreviewDialog]", err);
        setError(err instanceof Error ? err.message : String(err));
        setStep("upload");
      });
  }

  function handleTextSubmit() {
    if (!textInput.trim()) return;

    setError(null);
    setStep("loading");
    setScannedCount(0);
    setShowExercises(false);

    analyzeScheda({ data: { mode: "text", text: textInput.trim() } })
      .then((result) => {
        setPlanName(result.plan_name);
        // Inferisci il muscle_group se l'AI ha prodotto "Braccia"
        const processedExercises = result.exercises.map((ex) => ({
          ...ex,
          muscle_group:
            ex.muscle_group === "Braccia"
              ? (inferMuscleGroup(ex.name) ?? ex.muscle_group)
              : ex.muscle_group,
        }));
        setExercises(processedExercises);
        setScannedCount(processedExercises.length);
        setStep("preview");
        setTimeout(() => setShowExercises(true), 150);
      })
      .catch((err) => {
        console.error("[ScanPreviewDialog]", err);
        setError(err instanceof Error ? err.message : String(err));
        setStep("upload");
      });
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
              ? t("Crea con AI", "Create with AI")
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
            <div className="space-y-4">
              {/* Tab switcher */}
              <div className="flex rounded-full border border-border bg-muted p-1">
                <button
                  onClick={() => setInputMode("image")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors ${
                    inputMode === "image"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  {t("Foto", "Photo")}
                </button>
                <button
                  onClick={() => setInputMode("text")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors ${
                    inputMode === "text"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  {t("Testo", "Text")}
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-destructive">{t("Errore", "Error")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="shrink-0 p-1 text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {inputMode === "image" ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      {t(
                        "Carica una foto che rappresenti 1 SOLO giorno di allenamento. Se la scheda ha più giorni, ritaglia l'immagine per mostrare solo un giorno alla volta.",
                        "Upload a photo showing ONLY 1 workout day. If the plan has multiple days, crop the image to show one day at a time.",
                      )}
                    </p>
                  </div>
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
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    rows={8}
                    placeholder={t(
                      "Descrivi la tua scheda di allenamento...\n\nEsempio:\n- Panca piana 4x8 80kg\n- Croci con manubri 3x12 14kg\n- Shoulder press 3x10 20kg\n\nOppure descrivi il tuo obiettivo e l'AI creera' la scheda per te.",
                      "Describe your workout plan...\n\nExample:\n- Bench press 4x8 80kg\n- Dumbbell flyes 3x12 14kg\n- Shoulder press 3x10 20kg\n\nOr describe your goal and AI will create the plan for you.",
                    )}
                    className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-foreground"
                  />
                  <button
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-60 active:scale-[0.98]"
                  >
                    <FileText className="h-4 w-4" />
                    {t("Genera scheda", "Generate plan")}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center gap-6 py-12">
              {preview && (
                <div className="relative w-48 overflow-hidden rounded-2xl">
                  <img
                    src={preview}
                    alt="Analisi"
                    className="w-full object-contain"
                    style={{ maxHeight: 220 }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent 0%, rgba(124,58,237,0.08) 45%, rgba(124,58,237,0.25) 50%, rgba(124,58,237,0.08) 55%, transparent 100%)",
                      animation: "scanLine 2s ease-in-out infinite",
                    }}
                  />
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-primary"
                    style={{ animation: "dotPulse 1.4s ease-in-out infinite" }}
                  />
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-primary"
                    style={{ animation: "dotPulse 1.4s ease-in-out 0.2s infinite" }}
                  />
                  <span
                    className="inline-block h-2 w-2 rounded-full bg-primary"
                    style={{ animation: "dotPulse 1.4s ease-in-out 0.4s infinite" }}
                  />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("Analisi della scheda in corso...", "Analyzing the workout plan...")}
                </p>
              </div>
              <style>{`
                @keyframes scanLine {
                  0% { transform: translateY(-100%); }
                  100% { transform: translateY(100%); }
                }
                @keyframes dotPulse {
                  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                  40% { opacity: 1; transform: scale(1.1); }
                }
              `}</style>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              {/* Photo thumbnail + counter */}
              {preview && (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  style={{
                    opacity: showExercises ? 1 : 0,
                    transform: showExercises ? "translateY(0)" : "translateY(6px)",
                    transition: "opacity 0.3s ease, transform 0.3s ease",
                  }}
                >
                  <img
                    src={preview}
                    alt="Scheda scansionata"
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      {t("Scheda scansionata", "Scanned plan")}
                    </p>
                    <p className="text-sm font-bold">
                      {scannedCount} {t("esercizi trovati", "exercises found")}
                    </p>
                  </div>
                </div>
              )}

              {/* Muscle groups summary bar */}
              {exercises.length > 0 && (
                <MuscleGroupsBar exercises={exercises} visible={showExercises} />
              )}

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
                  <div
                    key={idx}
                    style={{
                      opacity: showExercises ? 1 : 0,
                      transform: showExercises ? "translateY(0)" : "translateY(8px)",
                      transition: `opacity 0.3s ease ${idx * 0.08}s, transform 0.3s ease ${idx * 0.08}s`,
                    }}
                  >
                    <ExercisePreviewRow
                      exercise={ex}
                      onChange={(patch) => updateExercise(idx, patch)}
                      onRemove={() => removeExercise(idx)}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={addExercise}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-3 text-sm font-semibold text-muted-foreground"
              >
                <Plus className="h-4 w-4" /> {t("Aggiungi esercizio", "Add exercise")}
              </button>

              <style>{`
                @keyframes fadeInUp {
                  from { opacity: 0; transform: translateY(8px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MuscleGroupsBar({ exercises, visible }: { exercises: Exercise[]; visible: boolean }) {
  const { t } = useLanguage();
  const uniqueMuscles = [...new Set(exercises.map((e) => e.muscle_group))];

  return (
    <div
      className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-card p-3"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.3s ease 0.1s, transform 0.3s ease 0.1s",
      }}
    >
      <p className="mr-1 text-xs font-semibold text-muted-foreground">{t("Muscoli", "Muscles")}:</p>
      {uniqueMuscles.map((muscle) => (
        <span
          key={muscle}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: muscleColor(muscle) }}
          />
          {t(muscle, muscle)}
        </span>
      ))}
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
  const [text, setText] = useState(String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setText(String(value));
  }, [value]);

  return (
    <div>
      <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        value={text}
        min={0}
        step={step}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw !== "") {
            const n = Number(raw);
            if (!Number.isNaN(n)) onChange(Math.max(0, n));
          }
        }}
        onBlur={() => {
          focusedRef.current = false;
          if (text === "") {
            onChange(0);
            setText("0");
          } else {
            setText(String(value));
          }
        }}
        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-foreground"
      />
    </div>
  );
}

function compressImage(file: File): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1024;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, 0.8);
        const base64 = dataUrl.split(",")[1];
        resolve({ dataUrl, base64, mimeType });
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
