import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { P as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as useWeightUnit } from "./useWeightUnit-6izDvxCm.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { g as Minus, j as Check, l as Timer, n as VolumeX, p as Plus, r as Volume2, t as X } from "../_libs/lucide-react.mjs";
import { t as Route } from "./allena._planId-CXgpBNAd.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, l as useConfirmDialog, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./useConfirmDialog-Dl4MI-Wg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/allena._planId-CDOoqs0A.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Ritorna l'ultimo `session_logs` (reps/weight/created_at) per il dato nome esercizio.
* - RLS filtra automaticamente per `auth.uid() = user_id`
* - Cache 5 min (staleTime)
* - Se l'esercizio non ha logs, ritorna null (utile per "Prima volta")
*/
function useLastSessionLog(exerciseName) {
	return useQuery({
		queryKey: ["last-log", exerciseName ?? ""],
		queryFn: async () => {
			if (!exerciseName) return null;
			const { data, error } = await supabase.from("session_logs").select("reps, weight, created_at").eq("exercise_name", exerciseName).order("created_at", { ascending: false }).limit(1).maybeSingle();
			if (error) throw error;
			return data;
		},
		enabled: !!exerciseName,
		staleTime: 1e3 * 60 * 5
	});
}
var SOUND_STORAGE_KEY = "gymbro_sound_enabled";
function readSoundPref() {
	if (typeof window === "undefined") return true;
	const v = window.localStorage.getItem(SOUND_STORAGE_KEY);
	return v === null ? true : v === "true";
}
/**
* Rest timer con:
* - Vibrazione al termine (`navigator.vibrate`) se supportata
* - Audio finale (`/sounds/beep.mp3`) — toggle persistito in localStorage
* - Notification API al termine SOLO se l'app è in background e il permesso è concesso
*/
function RestTimer() {
	const [seconds, setSeconds] = (0, import_react.useState)(0);
	const [running, setRunning] = (0, import_react.useState)(false);
	const [target, setTarget] = (0, import_react.useState)(90);
	const [soundOn, setSoundOn] = (0, import_react.useState)(readSoundPref);
	const tickRef = (0, import_react.useRef)(null);
	const finishedRef = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		if (typeof window === "undefined") return;
		try {
			window.localStorage.setItem(SOUND_STORAGE_KEY, soundOn ? "true" : "false");
		} catch {}
	}, [soundOn]);
	(0, import_react.useEffect)(() => {
		if (running) {
			finishedRef.current = false;
			tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1e3);
		} else if (tickRef.current) {
			clearInterval(tickRef.current);
			tickRef.current = null;
		}
		return () => {
			if (tickRef.current) {
				clearInterval(tickRef.current);
				tickRef.current = null;
			}
		};
	}, [running]);
	(0, import_react.useEffect)(() => {
		finishedRef.current = false;
	}, [target]);
	(0, import_react.useEffect)(() => {
		if (!running || seconds < target || finishedRef.current) return;
		finishedRef.current = true;
		setRunning(false);
		if (typeof navigator !== "undefined" && "vibrate" in navigator) try {
			navigator.vibrate([
				200,
				100,
				200
			]);
		} catch {}
		if (soundOn && typeof Audio !== "undefined") try {
			const audio = new Audio("/sounds/beep.mp3");
			audio.volume = .8;
			audio.play().catch(() => {});
		} catch {}
		if (typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") try {
			new Notification("GymBro", { body: "Riposo terminato! Prossima serie 💪" });
		} catch {}
	}, [
		running,
		seconds,
		target,
		soundOn
	]);
	const toggleSound = (0, import_react.useCallback)(() => setSoundOn((v) => !v), []);
	const remaining = Math.max(0, target - seconds);
	const mm = String(Math.floor(remaining / 60));
	const ss = String(remaining % 60).padStart(2, "0");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-8 rounded-3xl border border-border bg-card p-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Timer, { className: "h-4 w-4" }), " Recupero"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex gap-1",
				children: [
					60,
					90,
					120,
					180
				].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						setTarget(t);
						setSeconds(0);
					},
					className: `rounded-full px-2.5 py-1 text-[10px] font-bold ${target === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`,
					children: [t, "s"]
				}, t))
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-5xl font-black tracking-tighter tabular-nums",
				children: [
					mm,
					":",
					ss
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: toggleSound,
						className: "rounded-full border border-border px-3 py-2 text-xs font-semibold",
						"aria-label": soundOn ? "Disattiva suono" : "Attiva suono",
						"aria-pressed": soundOn,
						title: soundOn ? "Suono attivo" : "Suono disattivato",
						children: soundOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => {
							setSeconds(0);
							setRunning(false);
						},
						className: "rounded-full border border-border px-4 py-2 text-xs font-semibold",
						children: "Reset"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setRunning((r) => !r),
						className: "rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground",
						children: running ? "Pausa" : "Avvia"
					})
				]
			})]
		})]
	});
}
function ActiveSession() {
	const { planId } = Route.useParams();
	const { user } = Route.useRouteContext();
	const navigate = useNavigate();
	const { display: fmtWeight } = useWeightUnit();
	const planQ = useQuery({
		queryKey: ["session-plan", planId],
		queryFn: async () => {
			const { data: plan } = await supabase.from("plans").select("id, name").eq("id", planId).maybeSingle();
			const { data: ex } = await supabase.from("exercises").select("*").eq("plan_id", planId).order("position", { ascending: true });
			return {
				plan,
				exercises: ex ?? []
			};
		}
	});
	const orphanQ = useQuery({
		queryKey: [
			"orphan-session",
			user.id,
			planId
		],
		queryFn: async () => {
			const { data, error } = await supabase.from("sessions").select("id, started_at").eq("plan_id", planId).eq("user_id", user.id).is("completed_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle();
			if (error) throw error;
			return data;
		},
		staleTime: 0
	});
	const [currentIdx, setCurrentIdx] = (0, import_react.useState)(0);
	const [logs, setLogs] = (0, import_react.useState)({});
	const [sessionId, setSessionId] = (0, import_react.useState)(null);
	const [finishing, setFinishing] = (0, import_react.useState)(false);
	const sessionCreated = (0, import_react.useRef)(false);
	const [userDecision, setUserDecision] = (0, import_react.useState)(null);
	const [orphanIdAtDecision, setOrphanIdAtDecision] = (0, import_react.useState)(null);
	const { confirm: confirmDialog, ConfirmDialog } = useConfirmDialog();
	(0, import_react.useEffect)(() => {
		if (sessionCreated.current) return;
		if (!planQ.data?.plan || orphanQ.isLoading || sessionId) return;
		const orphan = orphanQ.data;
		if (orphan && !userDecision) return;
		sessionCreated.current = true;
		(async () => {
			try {
				let resolvedId = null;
				if (orphan && userDecision === "resume" && orphanIdAtDecision) resolvedId = orphanIdAtDecision;
				else if (planQ.data?.plan) {
					const { data, error } = await supabase.from("sessions").insert({
						user_id: user.id,
						plan_id: planId,
						plan_name: planQ.data.plan.name
					}).select("id").single();
					if (error) throw error;
					resolvedId = data?.id ?? null;
					if (userDecision === "start-new" && orphanIdAtDecision) {
						const { error: delErr } = await supabase.from("sessions").delete().eq("id", orphanIdAtDecision);
						if (delErr) console.warn("Cleanup vecchia sessione fallito:", delErr.message);
					}
				}
				if (resolvedId) setSessionId(resolvedId);
			} catch (err) {
				sessionCreated.current = false;
				toast.error(err instanceof Error ? err.message : "Errore di sessione");
			}
		})();
	}, [
		planQ.data,
		orphanQ.data,
		orphanQ.isLoading,
		userDecision,
		orphanIdAtDecision,
		sessionId,
		planId,
		user.id
	]);
	(0, import_react.useEffect)(() => {
		if (!planQ.data?.exercises) return;
		setLogs((prev) => {
			const next = { ...prev };
			planQ.data.exercises.forEach((e) => {
				if (!next[e.id]) next[e.id] = Array.from({ length: e.sets }, () => ({
					reps: e.reps,
					weight: Number(e.weight),
					done: false
				}));
			});
			return next;
		});
	}, [planQ.data]);
	const exercises = planQ.data?.exercises ?? [];
	const current = exercises[currentIdx];
	const lastLogQ = useLastSessionLog(current?.name);
	(0, import_react.useEffect)(() => {
		if (!current || !lastLogQ.data || lastLogQ.isFetching) return;
		setLogs((prev) => {
			const sets = prev[current.id];
			if (!sets || sets.length === 0) return prev;
			if (!sets.every((s) => !s.done && s.reps === current.reps && s.weight === Number(current.weight))) return prev;
			const updated = [...sets];
			updated[0] = {
				...updated[0],
				reps: lastLogQ.data.reps,
				weight: Number(lastLogQ.data.weight)
			};
			return {
				...prev,
				[current.id]: updated
			};
		});
	}, [
		current?.id,
		current?.name,
		lastLogQ.data,
		lastLogQ.isFetching
	]);
	function decideResume() {
		if (!orphanQ.data?.id) return;
		setOrphanIdAtDecision(orphanQ.data.id);
		setUserDecision("resume");
	}
	function decideStartNew() {
		if (!orphanQ.data?.id) return;
		setOrphanIdAtDecision(orphanQ.data.id);
		setUserDecision("start-new");
	}
	const showOrphanModal = !!orphanQ.data && !userDecision;
	const blockForcedClose = (next) => {
		if (!next && !userDecision && orphanQ.data?.id) return;
	};
	async function cancelSession() {
		if (!await confirmDialog("Annullare l'allenamento?", "I dati non saranno salvati.")) return;
		if (sessionId) await supabase.from("sessions").delete().eq("id", sessionId);
		navigate({ to: "/" });
	}
	async function finishWorkout() {
		if (!sessionId) return;
		setFinishing(true);
		const rows = [];
		let totalVolume = 0;
		for (const ex of exercises) (logs[ex.id] ?? []).forEach((s, i) => {
			if (s.done) {
				rows.push({
					session_id: sessionId,
					user_id: user.id,
					exercise_name: ex.name,
					muscle_group: ex.muscle_group,
					set_number: i + 1,
					reps: s.reps,
					weight: s.weight
				});
				totalVolume += s.reps * s.weight;
			}
		});
		if (rows.length === 0) {
			toast.error("Nessuna serie completata");
			setFinishing(false);
			return;
		}
		await supabase.from("session_logs").insert(rows);
		await supabase.from("sessions").update({
			completed_at: (/* @__PURE__ */ new Date()).toISOString(),
			total_volume: totalVolume
		}).eq("id", sessionId);
		toast.success("Allenamento salvato!");
		navigate({ to: "/" });
	}
	const orphanDialog = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
		open: showOrphanModal,
		onOpenChange: blockForcedClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Allenamento in corso" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: orphanQ.data ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			"Hai una sessione interrotta iniziata il",
			" ",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: new Date(orphanQ.data.started_at).toLocaleString("it-IT", {
				dateStyle: "medium",
				timeStyle: "short"
			}) }),
			". Vuoi riprenderla o iniziarne una nuova?"
		] }) : "Caricamento…" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, {
			onClick: decideStartNew,
			disabled: !orphanQ.data?.id,
			children: "Inizia nuovo"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
			onClick: decideResume,
			disabled: !orphanQ.data?.id,
			children: "Riprendi"
		})] })] })
	});
	if (!current) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app flex min-h-screen flex-col items-center justify-center text-center",
		children: [
			planQ.data && exercises.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Questa scheda non ha esercizi."
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => navigate({
					to: "/schede/$planId",
					params: { planId }
				}),
				className: "mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground",
				children: "Aggiungi esercizi"
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Caricamento…"
			}),
			orphanDialog,
			ConfirmDialog
		]
	});
	const setsLog = logs[current.id] ?? [];
	const isLast = currentIdx === exercises.length - 1;
	function updateSet(idx, patch) {
		setLogs((prev) => ({
			...prev,
			[current.id]: prev[current.id].map((s, i) => i === idx ? {
				...s,
				...patch
			} : s)
		}));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background pb-32",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "container-app pt-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-5 flex items-center justify-between",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: cancelSession,
								className: "rounded-full p-2 text-muted-foreground",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
								children: [
									currentIdx + 1,
									" / ",
									exercises.length
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-9" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-6 h-1 w-full overflow-hidden rounded-full bg-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full bg-primary transition-all",
							style: { width: `${(currentIdx + 1) / exercises.length * 100}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground",
						children: current.muscle_group ?? "Esercizio"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl font-black tracking-tight",
						children: current.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-sm text-muted-foreground",
						children: [
							"Target: ",
							current.sets,
							" × ",
							current.reps,
							" @ ",
							fmtWeight(Number(current.weight))
						]
					}),
					current.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 rounded-xl bg-muted p-3 text-sm",
						children: current.notes
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-[2.5rem_1fr_1fr_2.5rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "Set" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-center",
										children: "Rip."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-center",
										children: "Kg"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {})
								]
							}),
							setsLog.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `grid grid-cols-[2.5rem_1fr_1fr_2.5rem] items-center gap-2 rounded-2xl border p-2 ${s.done ? "border-foreground bg-foreground/5" : "border-border bg-card"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-center text-lg font-black",
										children: i + 1
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepperInput, {
										value: s.reps,
										onChange: (v) => updateSet(i, { reps: v }),
										step: 1
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepperInput, {
										value: s.weight,
										onChange: (v) => updateSet(i, { weight: v }),
										step: 2.5
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => updateSet(i, { done: !s.done }),
										className: `flex h-10 w-10 items-center justify-center rounded-full transition ${s.done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" })
									})
								]
							}, i)),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setLogs((p) => ({
									...p,
									[current.id]: [...p[current.id], {
										reps: current.reps,
										weight: Number(current.weight),
										done: false
									}]
								})),
								className: "w-full rounded-2xl border-2 border-dashed border-border py-3 text-xs font-semibold text-muted-foreground",
								children: "+ Serie extra"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 h-5",
						children: lastLogQ.isLoading ? null : lastLogQ.data ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground",
							children: [
								"Ultima volta: ",
								lastLogQ.data.reps,
								" rip ×",
								" ",
								fmtWeight(Number(lastLogQ.data.weight))
							]
						}) : !lastLogQ.isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Prima volta 💪"
						}) : null
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RestTimer, {})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "container-app flex gap-2 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]",
					children: [currentIdx > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setCurrentIdx((i) => i - 1),
						className: "rounded-full border border-border px-5 py-3.5 text-sm font-semibold",
						children: "Indietro"
					}), !isLast ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setCurrentIdx((i) => i + 1),
						className: "flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]",
						children: "Prossimo esercizio"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: finishWorkout,
						disabled: finishing,
						className: "flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98] disabled:opacity-60",
						children: finishing ? "..." : "Termina allenamento"
					})]
				})
			}),
			orphanDialog,
			ConfirmDialog
		]
	});
}
function StepperInput({ value, onChange, step }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-center gap-1",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => onChange(Math.max(0, +(value - step).toFixed(2))),
				className: "flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "h-3.5 w-3.5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "number",
				value,
				inputMode: "decimal",
				onChange: (e) => onChange(Number(e.target.value)),
				className: "w-12 bg-transparent text-center text-lg font-bold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => onChange(+(value + step).toFixed(2)),
				className: "flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" })
			})
		]
	});
}
//#endregion
export { ActiveSession as component };
