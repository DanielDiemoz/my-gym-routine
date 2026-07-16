import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Trash2, GripVertical, Play, Pencil } from "lucide-react";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ExerciseAutocomplete, type ExerciseLibraryEntry } from "@/components/ExerciseAutocomplete";
import { muscleColor, MUSCLE_EN } from "@/lib/muscleColors";
import { useLanguage } from "@/lib/i18n";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/app/schede/$planId")({
  component: PlanEditor,
});

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  sets: number;
  reps: number;
  weight: number;
  notes: string | null;
  position: number;
  exercise_library_id?: string | null;
};

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

function PlanEditor() {
  const { planId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirmDialog();
  const { t } = useLanguage();

  const planQ = useQuery({
    queryKey: ["plan", planId],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("id, name").eq("id", planId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const exQ = useQuery({
    queryKey: ["exercises", planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*, exercise_library_id")
        .eq("plan_id", planId)
        .order("position", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [items, setItems] = useState<Exercise[]>([]);
  useEffect(() => { if (exQ.data) setItems(exQ.data); }, [exQ.data]);

  const [editingName, setEditingName] = useState(false);
  const [planName, setPlanName] = useState("");
  useEffect(() => { if (planQ.data) setPlanName(planQ.data.name); }, [planQ.data]);

  const hasActiveQ = useQuery({
    queryKey: ["has-active-session", user.id, planId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("plan_id", planId)
        .is("completed_at", null)
        .maybeSingle();
      return !!data;
    },
    staleTime: 0,
  });

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((x) => x.id === active.id);
    const newIdx = items.findIndex((x) => x.id === over.id);
    const next = arrayMove(items, oldIdx, newIdx).map((x, i) => ({ ...x, position: i }));
    setItems(next);
    await Promise.all(next.map((x) => supabase.from("exercises").update({ position: x.position }).eq("id", x.id)));
  }

  async function moveExerciseUp(id: string) {
    const idx = items.findIndex((x) => x.id === id);
    if (idx <= 0) return;
    const next = arrayMove(items, idx, idx - 1).map((x, i) => ({ ...x, position: i }));
    setItems(next);
    await Promise.all(next.map((x) => supabase.from("exercises").update({ position: x.position }).eq("id", x.id)));
  }

  async function moveExerciseDown(id: string) {
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0 || idx >= items.length - 1) return;
    const next = arrayMove(items, idx, idx + 1).map((x, i) => ({ ...x, position: i }));
    setItems(next);
    await Promise.all(next.map((x) => supabase.from("exercises").update({ position: x.position }).eq("id", x.id)));
  }

  async function deleteExercise(id: string) {
    setItems((arr) => arr.filter((x) => x.id !== id));
    await supabase.from("exercises").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["exercises", planId] });
  }

  async function savePlanName() {
    if (!planName.trim()) return;
    await supabase.from("plans").update({ name: planName.trim() }).eq("id", planId);
    setEditingName(false);
    qc.invalidateQueries({ queryKey: ["plan", planId] });
    qc.invalidateQueries({ queryKey: ["plans-all", user.id] });
    qc.invalidateQueries({ queryKey: ["plans", user.id] });
  }

  async function deletePlan() {
    const ok = await confirmDialog(t("Eliminare questa scheda?", "Delete this plan?"), t("L'azione è irreversibile.", "This action is irreversible."));
    if (!ok) return;
    await supabase.from("plans").delete().eq("id", planId);
    qc.invalidateQueries({ queryKey: ["plans-all", user.id] });
    qc.invalidateQueries({ queryKey: ["plans", user.id] });
    navigate({ to: "/schede" });
  }

  return (
    <div className="container-app pt-6">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/schede" className="flex items-center gap-1 text-sm font-semibold text-muted-foreground">
          <ChevronLeft className="h-5 w-5" /> {t("Schede", "Plans")}
        </Link>
        <button onClick={deletePlan} className="text-xs font-semibold text-destructive">{t("Elimina", "Delete")}</button>
      </div>

      <div className="mb-8">
        {editingName ? (
          <input
            autoFocus
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            onBlur={savePlanName}
            onKeyDown={(e) => e.key === "Enter" && savePlanName()}
            className="w-full bg-transparent text-3xl font-black tracking-tight outline-none"
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="flex items-center gap-2 text-left">
            <h1 className="text-3xl font-black tracking-tight">{planQ.data?.name}</h1>
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{items.length} {items.length === 1 ? t("esercizio", "exercise") : t("esercizi", "exercises")}</p>
      </div>

      {items.length > 0 && (
        <Link
          to="/allena/$planId"
          params={{ planId }}
          className="no-tap-highlight mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]"
        >
          <Play className="h-4 w-4 fill-current" /> {hasActiveQ.data ? t("Continua", "Continue") : t("Inizia", "Start")} {t("allenamento", "workout")}
        </Link>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((x) => x.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((ex, idx) => (
              <SortableRow
                key={ex.id}
                ex={ex}
                onEdit={() => setEditing(ex)}
                onDelete={() => deleteExercise(ex.id)}
                onMoveUp={() => moveExerciseUp(ex.id)}
                onMoveDown={() => moveExerciseDown(ex.id)}
                isFirst={idx === 0}
                isLast={idx === items.length - 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={() => setAdding(true)}
        className="no-tap-highlight mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-semibold text-muted-foreground"
      >
        <Plus className="h-4 w-4" /> {t("Aggiungi esercizio", "Add exercise")}
      </button>

      {(adding || editing) && (
        <ExerciseSheet
          ex={editing}
          planId={planId}
          userId={user.id}
          nextPosition={items.length}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); qc.invalidateQueries({ queryKey: ["exercises", planId] }); }}
        />
      )}
      {ConfirmDialog}
    </div>
  );
}

function SortableRow({ ex, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  ex: Exercise;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-2xl border border-border bg-card p-3 ${isDragging ? "opacity-60" : ""}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none p-1 text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </button>
      <button onClick={onEdit} className="flex-1 text-left">
        <div className="font-semibold">{ex.name}</div>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted-foreground">
          <span>
            {ex.sets}×{ex.reps} · {Number(ex.weight)} Kg
          </span>
          {ex.muscle_group && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${muscleColor(ex.muscle_group)} / 15%`,
                color: muscleColor(ex.muscle_group),
              }}
            >
              {t(ex.muscle_group, MUSCLE_EN[ex.muscle_group] ?? ex.muscle_group)}
            </span>
          )}
        </div>
      </button>
      <div className="flex items-center gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
          aria-label={t("Sposta su", "Move up")}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-20"
          aria-label={t("Sposta giù", "Move down")}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <button onClick={onDelete} className="p-2 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function ExerciseSheet({
  ex, planId, userId, nextPosition, onClose, onSaved,
}: {
  ex: Exercise | null; planId: string; userId: string; nextPosition: number;
  onClose: () => void; onSaved: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState(ex?.name ?? "");
  const [muscle, setMuscle] = useState(ex?.muscle_group ?? "Petto");
  const [sets, setSets] = useState(ex?.sets ?? 3);
  const [reps, setReps] = useState(ex?.reps ?? 10);
  const [weight, setWeight] = useState<number>(Number(ex?.weight ?? 0));
  const [notes, setNotes] = useState(ex?.notes ?? "");
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset locale quando si entra in modalità "modifica" con un altro esercizio.
  useEffect(() => {
    if (ex) {
      setName(ex.name);
      setMuscle(ex.muscle_group ?? "Petto");
      setSets(ex.sets);
      setReps(ex.reps);
      setWeight(Number(ex.weight));
      setNotes(ex.notes ?? "");
      setLibraryId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex?.id]);

  function handlePick(entry: ExerciseLibraryEntry) {
    setName(entry.name);
    setMuscle(entry.muscle_group);
    setLibraryId(entry.id);
  }

  async function save() {
    if (!name.trim()) { toast.error(t("Inserisci un nome", "Enter a name")); return; }
    setSaving(true);
    const data = {
      name: name.trim(),
      muscle_group: muscle,
      sets,
      reps,
      weight,
      notes: notes.trim() || null,
      exercise_library_id: libraryId,
    };
    if (ex) {
      await supabase
        .from("exercises")
        .update(data)
        .eq("id", ex.id);
    } else {
      await supabase.from("exercises").insert({
        ...data,
        plan_id: planId,
        user_id: userId,
        position: nextPosition,
      });
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-background p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border sm:hidden" />
        <h3 className="text-xl font-bold">{ex ? t("Modifica esercizio", "Edit exercise") : t("Nuovo esercizio", "New exercise")}</h3>

        <div className="mt-5 space-y-4">
          <Field label={t("Nome", "Name")}>
            <ExerciseAutocomplete
              value={name}
              onChange={setName}
              onPick={handlePick}
              placeholder={t("Cerca esercizio (es. Panca piana)", "Search exercise (e.g. Bench press)")}
            />
            <p className="mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              {t("Seleziona un suggerimento per auto-compilare il gruppo muscolare.", "Pick a suggestion to auto-fill the muscle group.")}
            </p>
          </Field>

          <Field label={t("Gruppo muscolare", "Muscle group")}>
            <div className="flex flex-wrap gap-2">
              {MUSCLES.map(([value, en]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMuscle(value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    muscle === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: muscleColor(value) }}
                  />
                  {t(value, en)}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <NumField label={t("Serie", "Sets")} value={sets} onChange={setSets} min={0} max={20} />
            <NumField label={t("Rip.", "Reps")} value={reps} onChange={setReps} min={0} max={100} />
            <NumField label={t("Kg", "Kg")} value={weight} onChange={setWeight} min={0} step={0.5} />
          </div>

          <Field label={t("Note (opzionale)", "Notes (optional)")}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-foreground"
            />
          </Field>
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-3 text-sm font-semibold">{t("Annulla", "Cancel")}</button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {saving ? "..." : t("Salva", "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number }) {
  const [text, setText] = useState(String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setText(String(value));
  }, [value]);

  function clamp(n: number) {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  }

  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="decimal"
        value={text}
        min={min} max={max} step={step}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          if (raw !== "") {
            const n = Number(raw);
            if (!Number.isNaN(n)) onChange(clamp(n));
          }
        }}
        onBlur={() => {
          focusedRef.current = false;
          if (text === "") {
            const zero = clamp(0);
            onChange(zero);
            setText(String(zero));
          } else {
            setText(String(value));
          }
        }}
        className="w-full rounded-xl border border-border bg-card px-3 py-3 text-center text-base font-bold outline-none focus:border-foreground"
      />
    </Field>
  );
}
