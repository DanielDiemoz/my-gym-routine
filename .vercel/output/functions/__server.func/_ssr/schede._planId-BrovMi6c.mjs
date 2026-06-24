import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { d as CSS, i as closestCenter, l as useSensor, r as PointerSensor, t as DndContext, u as useSensors } from "../_libs/@dnd-kit/core+[...].mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { P as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { i as useQueryClient, n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { O as ChevronLeft, c as Trash2, f as Search, h as Pencil, m as Play, p as Plus, x as GripVertical } from "../_libs/lucide-react.mjs";
import { l as useConfirmDialog } from "./useConfirmDialog-Dl4MI-Wg.mjs";
import { t as Route } from "./schede._planId-CP8Sd1mJ.mjs";
import { t as _e } from "../_libs/cmdk.mjs";
import { i as verticalListSortingStrategy, n as arrayMove, r as useSortable, t as SortableContext } from "../_libs/dnd-kit__sortable.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/schede._planId-BrovMi6c.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Command$1 = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e, {
	ref,
	className: cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className),
	...props
}));
Command$1.displayName = _e.displayName;
var CommandInput = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
	className: "flex items-center border-b px-3",
	"cmdk-input-wrapper": "",
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "mr-2 h-4 w-4 shrink-0 opacity-50" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Input, {
		ref,
		className: cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className),
		...props
	})]
}));
CommandInput.displayName = _e.Input.displayName;
var CommandList = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.List, {
	ref,
	className: cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className),
	...props
}));
CommandList.displayName = _e.List.displayName;
var CommandEmpty = import_react.forwardRef((props, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Empty, {
	ref,
	className: "py-6 text-center text-sm",
	...props
}));
CommandEmpty.displayName = _e.Empty.displayName;
var CommandGroup = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Group, {
	ref,
	className: cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", className),
	...props
}));
CommandGroup.displayName = _e.Group.displayName;
var CommandSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Separator, {
	ref,
	className: cn("-mx-1 h-px bg-border", className),
	...props
}));
CommandSeparator.displayName = _e.Separator.displayName;
var CommandItem = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(_e.Item, {
	ref,
	className: cn("relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", className),
	...props
}));
CommandItem.displayName = _e.Item.displayName;
var CommandShortcut = ({ className, ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("ml-auto text-xs tracking-widest text-muted-foreground", className),
		...props
	});
};
CommandShortcut.displayName = "CommandShortcut";
/**
* cmdk-based autocomplete per la libreria esercizi GymBro.
* - Debounce 300ms sulle query Supabase.
* - Match ILIKE sul nome (case-insensitive, italian).
* - Selezione → callback onPick + popolamento parent.
* - L'utente può scrivere un nome custom (nessun blocco).
* - Stile shadcn Card (`bg-card border border-border rounded-2xl`).
*/
function ExerciseAutocomplete({ value, onChange, onPick, onBlur, placeholder }) {
	const [debounced, setDebounced] = (0, import_react.useState)(value.trim());
	const [open, setOpen] = (0, import_react.useState)(false);
	const debounceRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
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
		queryFn: async () => {
			const pattern = `%${debounced}%`;
			const { data, error } = await supabase.from("exercise_library").select("id, name, muscle_group").ilike("name", pattern).order("name", { ascending: true }).limit(8);
			if (error) {
				console.warn("[ExerciseAutocomplete]", error.message);
				return [];
			}
			return data ?? [];
		},
		staleTime: 1e3 * 60 * 2
	});
	(0, import_react.useEffect)(() => {
		setOpen(value.trim().length >= 2);
	}, [value]);
	const results = (0, import_react.useMemo)(() => query.data ?? [], [query.data]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "relative",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Command$1, {
			shouldFilter: false,
			className: "overflow-visible rounded-2xl border border-border bg-card",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandInput, {
				value,
				onValueChange: (v) => onChange(v),
				onFocus: () => setOpen(true),
				onBlur: () => {
					setTimeout(() => setOpen(false), 120);
					onBlur?.();
				},
				placeholder: placeholder ?? "Cerca esercizio...",
				className: "rounded-2xl border-transparent"
			}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandList, {
				className: "absolute left-0 right-0 top-full z-50 mt-1 max-h-64 rounded-2xl border border-border bg-card shadow-lg",
				children: query.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "px-3 py-2 text-xs text-muted-foreground",
					children: "Caricamento..."
				}) : results.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandEmpty, { children: debounced.length < 2 ? "Digita almeno 2 caratteri" : "Nessun risultato. Puoi scrivere un nome custom." }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandGroup, {
					heading: "Libreria",
					children: results.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandItem, {
						value: e.id,
						onSelect: () => {
							onChange(e.name);
							onPick?.(e);
							setOpen(false);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex w-full items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium",
								children: e.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-2 text-[10px] uppercase tracking-widest text-muted-foreground",
								children: e.muscle_group
							})]
						})
					}, e.id))
				})
			})]
		})
	});
}
var MUSCLES = [
	"Petto",
	"Schiena",
	"Gambe",
	"Spalle",
	"Braccia",
	"Core",
	"Glutei",
	"Altro"
];
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
		}
	});
	const exQ = useQuery({
		queryKey: ["exercises", planId],
		queryFn: async () => {
			const { data, error } = await supabase.from("exercises").select("*, exercise_library_id").eq("plan_id", planId).order("position", { ascending: true });
			if (error) throw error;
			return data ?? [];
		}
	});
	const [items, setItems] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		if (exQ.data) setItems(exQ.data);
	}, [exQ.data]);
	const [editingName, setEditingName] = (0, import_react.useState)(false);
	const [planName, setPlanName] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (planQ.data) setPlanName(planQ.data.name);
	}, [planQ.data]);
	const [adding, setAdding] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
	async function onDragEnd(e) {
		const { active, over } = e;
		if (!over || active.id === over.id) return;
		const next = arrayMove(items, items.findIndex((x) => x.id === active.id), items.findIndex((x) => x.id === over.id)).map((x, i) => ({
			...x,
			position: i
		}));
		setItems(next);
		await Promise.all(next.map((x) => supabase.from("exercises").update({ position: x.position }).eq("id", x.id)));
	}
	async function deleteExercise(id) {
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
		if (!await confirmDialog("Eliminare questa scheda?", "L'azione è irreversibile.")) return;
		await supabase.from("plans").delete().eq("id", planId);
		qc.invalidateQueries({ queryKey: ["plans-all", user.id] });
		qc.invalidateQueries({ queryKey: ["plans", user.id] });
		navigate({ to: "/schede" });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app pt-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-6 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/schede",
					className: "flex items-center gap-1 text-sm font-semibold text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-5 w-5" }), " Schede"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: deletePlan,
					className: "text-xs font-semibold text-destructive",
					children: "Elimina"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-8",
				children: [editingName ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					autoFocus: true,
					value: planName,
					onChange: (e) => setPlanName(e.target.value),
					onBlur: savePlanName,
					onKeyDown: (e) => e.key === "Enter" && savePlanName(),
					className: "w-full bg-transparent text-3xl font-black tracking-tight outline-none"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setEditingName(true),
					className: "flex items-center gap-2 text-left",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl font-black tracking-tight",
						children: planQ.data?.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4 text-muted-foreground" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: [
						items.length,
						" ",
						items.length === 1 ? "esercizio" : "esercizi"
					]
				})]
			}),
			items.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/allena/$planId",
				params: { planId },
				className: "no-tap-highlight mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "h-4 w-4 fill-current" }), " Inizia allenamento"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DndContext, {
				sensors,
				collisionDetection: closestCenter,
				onDragEnd,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortableContext, {
					items: items.map((x) => x.id),
					strategy: verticalListSortingStrategy,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-2",
						children: items.map((ex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortableRow, {
							ex,
							onEdit: () => setEditing(ex),
							onDelete: () => deleteExercise(ex.id)
						}, ex.id))
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => setAdding(true),
				className: "no-tap-highlight mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-semibold text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Aggiungi esercizio"]
			}),
			(adding || editing) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExerciseSheet, {
				ex: editing,
				planId,
				userId: user.id,
				nextPosition: items.length,
				onClose: () => {
					setAdding(false);
					setEditing(null);
				},
				onSaved: () => {
					setAdding(false);
					setEditing(null);
					qc.invalidateQueries({ queryKey: ["exercises", planId] });
				}
			}),
			ConfirmDialog
		]
	});
}
function SortableRow({ ex, onEdit, onDelete }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ex.id });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: setNodeRef,
		style: {
			transform: CSS.Transform.toString(transform),
			transition
		},
		className: `flex items-center gap-2 rounded-2xl border border-border bg-card p-3 ${isDragging ? "opacity-60" : ""}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				...attributes,
				...listeners,
				className: "cursor-grab touch-none p-1 text-muted-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GripVertical, { className: "h-5 w-5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: onEdit,
				className: "flex-1 text-left",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-semibold",
					children: ex.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-xs text-muted-foreground",
					children: [
						ex.sets,
						"×",
						ex.reps,
						" · ",
						Number(ex.weight),
						"kg",
						ex.muscle_group ? ` · ${ex.muscle_group}` : ""
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: onDelete,
				className: "p-2 text-muted-foreground hover:text-destructive",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
			})
		]
	});
}
function ExerciseSheet({ ex, planId, userId, nextPosition, onClose, onSaved }) {
	const [name, setName] = (0, import_react.useState)(ex?.name ?? "");
	const [muscle, setMuscle] = (0, import_react.useState)(ex?.muscle_group ?? "Petto");
	const [sets, setSets] = (0, import_react.useState)(ex?.sets ?? 3);
	const [reps, setReps] = (0, import_react.useState)(ex?.reps ?? 10);
	const [weight, setWeight] = (0, import_react.useState)(Number(ex?.weight ?? 0));
	const [notes, setNotes] = (0, import_react.useState)(ex?.notes ?? "");
	const [libraryId, setLibraryId] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (ex) {
			setName(ex.name);
			setMuscle(ex.muscle_group ?? "Petto");
			setSets(ex.sets);
			setReps(ex.reps);
			setWeight(Number(ex.weight));
			setNotes(ex.notes ?? "");
			setLibraryId(null);
		}
	}, [ex?.id]);
	function handlePick(entry) {
		setName(entry.name);
		setMuscle(entry.muscle_group);
		setLibraryId(entry.id);
	}
	async function save() {
		if (!name.trim()) {
			toast.error("Inserisci un nome");
			return;
		}
		setSaving(true);
		const data = {
			name: name.trim(),
			muscle_group: muscle,
			sets,
			reps,
			weight,
			notes: notes.trim() || null,
			exercise_library_id: libraryId
		};
		if (ex) await supabase.from("exercises").update(data).eq("id", ex.id);
		else await supabase.from("exercises").insert({
			...data,
			plan_id: planId,
			user_id: userId,
			position: nextPosition
		});
		onSaved();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			onClick: (e) => e.stopPropagation(),
			className: "w-full max-w-md rounded-t-3xl bg-background p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:rounded-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto mb-4 h-1.5 w-12 rounded-full bg-border sm:hidden" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-xl font-bold",
					children: ex ? "Modifica esercizio" : "Nuovo esercizio"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Field, {
							label: "Nome",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExerciseAutocomplete, {
								value: name,
								onChange: setName,
								onPick: handlePick,
								placeholder: "Cerca esercizio (es. Panca piana)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground",
								children: "Seleziona un suggerimento per auto-compilare il gruppo muscolare."
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Gruppo muscolare",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-2",
								children: MUSCLES.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setMuscle(m),
									className: `rounded-full px-3 py-1.5 text-xs font-semibold ${muscle === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`,
									children: m
								}, m))
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Serie",
									value: sets,
									onChange: setSets,
									min: 1,
									max: 20
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Rip.",
									value: reps,
									onChange: setReps,
									min: 1,
									max: 100
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumField, {
									label: "Kg",
									value: weight,
									onChange: setWeight,
									min: 0,
									step: .5
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Note (opzionale)",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: notes,
								onChange: (e) => setNotes(e.target.value),
								rows: 2,
								className: "w-full resize-none rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-foreground"
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "flex-1 rounded-full border border-border py-3 text-sm font-semibold",
						children: "Annulla"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: save,
						disabled: saving,
						className: "flex-1 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60",
						children: saving ? "..." : "Salva"
					})]
				})
			]
		})
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground",
		children: label
	}), children] });
}
function NumField({ label, value, onChange, min, max, step = 1 }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
		label,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "number",
			inputMode: "decimal",
			value,
			min,
			max,
			step,
			onChange: (e) => onChange(Number(e.target.value)),
			className: "w-full rounded-xl border border-border bg-card px-3 py-3 text-center text-base font-bold outline-none focus:border-foreground"
		})
	});
}
//#endregion
export { PlanEditor as component };
