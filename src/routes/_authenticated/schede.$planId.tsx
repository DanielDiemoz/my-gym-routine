import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Plus, Trash2, GripVertical, Play, Pencil } from "lucide-react";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ExerciseAutocomplete, type ExerciseLibraryEntry } from "@/components/ExerciseAutocomplete";
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

export const Route = createFileRoute("/_authenticated/schede/$planId")({
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

const MUSCLES = ["Petto", "Schiena", "Gambe", "Spalle", "Braccia", "Core", "Glutei", "Altro"];

function PlanEditor() {
  const { planId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirmDialog();

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
    const ok = await confirmDialog("Eliminare questa scheda?", "L'azione è irreversibile.");
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
          <ChevronLeft className="h-5 w-5" /> Schede
        </Link>
        <button onClick={deletePlan} className="text-xs font-semibold text-destructive">Elimina</button>
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
        <p className="mt-1 text-sm text-muted-foreground">{items.length} {items.length === 1 ? "esercizio" : "esercizi"}</p>
      </div>

      {items.length > 0 && (
        <Link
          to="/allena/$planId"
          params={{ planId }}
          className="no-tap-highlight mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]"
        >
          <Play className="h-4 w-4 fill-current" /> Inizia allenamento
        </Link>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((x) => x.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((ex) => (
              <SortableRow key={ex.id} ex={ex} onEdit={() => setEditing(ex)} onDelete={() => deleteExercise(ex.id)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={() => setAdding(true)}
        className="no-tap-highlight mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-semibold text-muted-foreground"
      >
        <Plus className="h-4 w-4" /> Aggiungi esercizio
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

function SortableRow({ ex, onEdit, onDelete }: { ex: Exercise; onEdit: () => void; onDelete: () => void }) {
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
        <div className="text-xs text-muted-foreground">
          {ex.sets}×{ex.reps} · {Number(ex.weight)}kg{ex.muscle_group ? ` · ${ex.muscle_group}` : ""}
        </div>
      </button>
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
    if (!name.trim()) { toast.error("Inserisci un nome"); return; }
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
        <h3 className="text-xl font-bold">{ex ? "Modifica esercizio" : "Nuovo esercizio"}</h3>

        <div className="mt-5 space-y-4">
          <Field label="Nome">
            <ExerciseAutocomplete
              value={name}
              onChange={setName}
              onPick={handlePick}
              placeholder="Cerca esercizio (es. Panca piana)"
            />
            <p className="mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              Seleziona un suggerimento per auto-compilare il gruppo muscolare.
            </p>
          </Field>

          <Field label="Gruppo muscolare">
            <div className="flex flex-wrap gap-2">
              {MUSCLES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMuscle(m)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    muscle === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <NumField label="Serie" value={sets} onChange={setSets} min={1} max={20} />
            <NumField label="Rip." value={reps} onChange={setReps} min={1} max={100} />
            <NumField label="Kg" value={weight} onChange={setWeight} min={0} step={0.5} />
          </div>

          <Field label="Note (opzionale)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-foreground"
            />
          </Field>
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-3 text-sm font-semibold">Annulla</button>
          <button onClick={save} disabled={saving} className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {saving ? "..." : "Salva"}
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
  return (
    <Field label={label}>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-border bg-card px-3 py-3 text-center text-base font-bold outline-none focus:border-foreground"
      />
    </Field>
  );
}
