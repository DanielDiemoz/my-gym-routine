import { i as __toESM } from "./_runtime.mjs";
import { A as require_jsx_runtime } from "./_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "./_libs/dnd-kit__accessibility+react.mjs";
import { C as startOfWeek, O as endOfWeek, P as differenceInCalendarDays, f as isSameDay, i as subDays, j as eachDayOfInterval, n as subWeeks, t as it, v as format } from "./_libs/date-fns.mjs";
import { t as supabase } from "./_ssr/client-Ya_BWEKn.mjs";
import { P as useNavigate, g as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { t as Route } from "./_authenticated-DHrY2awB.mjs";
import { t as cn } from "./_ssr/utils-C_uf36nf.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "./_libs/tanstack__react-query.mjs";
import { n as useWeightUnit } from "./_ssr/useWeightUnit-6izDvxCm.mjs";
import { t as Skeleton } from "./_ssr/skeleton-D9W9wFsj.mjs";
import { n as toast } from "./_libs/sonner.mjs";
import { A as ChevronDown, C as Flame, D as ChevronUp, O as ChevronRight, T as Download, _ as LogOut, a as Trophy, j as Check, o as TrendingUp, s as TrendingDown, u as Target, w as Dumbbell } from "./_libs/lucide-react.mjs";
import { a as SelectItemIndicator, c as SelectPortal, d as SelectSeparator$1, f as SelectTrigger$1, i as SelectItem$1, l as SelectScrollDownButton$1, m as SelectViewport, n as SelectContent$1, o as SelectItemText, p as SelectValue$1, r as SelectIcon, s as SelectLabel$1, t as Select$1, u as SelectScrollUpButton$1 } from "./_libs/@radix-ui/react-select+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authenticated-D_5M2hr0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Hook per esporre l'installabilità PWA.
* - `canInstall` = true se il browser ha emesso `beforeinstallprompt`
* - `install()` invoca il prompt nativo e gestisce userChoice
* Si resetta quando l'app è effettivamente installata (`appinstalled`).
*/
function usePWAInstall() {
	const [canInstall, setCanInstall] = (0, import_react.useState)(false);
	const deferredPrompt = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const onBeforeInstall = (e) => {
			e.preventDefault();
			deferredPrompt.current = e;
			setCanInstall(true);
		};
		const onInstalled = () => {
			deferredPrompt.current = null;
			setCanInstall(false);
		};
		window.addEventListener("beforeinstallprompt", onBeforeInstall);
		window.addEventListener("appinstalled", onInstalled);
		return () => {
			window.removeEventListener("beforeinstallprompt", onBeforeInstall);
			window.removeEventListener("appinstalled", onInstalled);
		};
	}, []);
	return {
		canInstall,
		install: (0, import_react.useCallback)(async () => {
			const prompt = deferredPrompt.current;
			if (!prompt) return;
			await prompt.prompt();
			const { outcome } = await prompt.userChoice;
			if (outcome === "accepted") {
				deferredPrompt.current = null;
				setCanInstall(false);
			}
		}, [])
	};
}
/**
* Bottone CTA per installare la PWA.
* - Si monta solo se `canInstall === true` (altrimenti ritorna null)
* - Click → invoca `install()` che mostra il prompt nativo del browser
*/
function PWAInstallButton() {
	const { canInstall, install } = usePWAInstall();
	if (!canInstall) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: () => {
			install();
		},
		className: "no-tap-highlight flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all active:scale-[0.98]",
		"aria-label": "Scarica l'app",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4" }), "Scarica l'app"]
	});
}
var Select = Select$1;
var SelectValue = SelectValue$1;
var SelectTrigger = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger$1, {
	ref,
	className: cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectIcon, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 opacity-50" })
	})]
}));
SelectTrigger.displayName = SelectTrigger$1.displayName;
var SelectScrollUpButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-4 w-4" })
}));
SelectScrollUpButton.displayName = SelectScrollUpButton$1.displayName;
var SelectScrollDownButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4" })
}));
SelectScrollDownButton.displayName = SelectScrollDownButton$1.displayName;
var SelectContent = import_react.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectPortal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent$1, {
	ref,
	className: cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectViewport, {
			className: cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton, {})
	]
}) }));
SelectContent.displayName = SelectContent$1.displayName;
var SelectLabel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectLabel$1, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", className),
	...props
}));
SelectLabel.displayName = SelectLabel$1.displayName;
var SelectItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem$1, {
	ref,
	className: cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemIndicator, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemText, { children })]
}));
SelectItem.displayName = SelectItem$1.displayName;
var SelectSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectSeparator$1, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
SelectSeparator.displayName = SelectSeparator$1.displayName;
/**
* Card Streak per la dashboard GymBro:
* - 🔥 streak attuale (oggi o ieri → walk-back)
* - Record personale (max run di giorni consecutivi)
* - Barra progresso settimanale vs `weeklyGoal`
* - Select per modificare weekly_goal (1-7)
*/
function StreakCard({ sessions, weeklyGoal, weeklyCount, onChangeGoal, isLoading }) {
	const safeWeeklyGoal = Math.max(1, Math.min(7, weeklyGoal || 3));
	const { current, record } = computeStreak(sessions.map((s) => s.completed_at).filter((v) => !!v));
	const ratio = Math.min(weeklyCount / safeWeeklyGoal, 1);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-4 rounded-2xl border border-border bg-card p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
					children: "Streak"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: `h-4 w-4 ${current > 0 ? "text-orange-500" : "text-muted-foreground"}` })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex items-baseline gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-3xl font-black tracking-tight",
					children: isLoading ? "—" : current
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm text-muted-foreground",
					children: current === 1 ? "giorno" : "giorni"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex items-center gap-1.5 text-xs text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "h-3 w-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Record: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-semibold text-foreground",
					children: isLoading ? "—" : record
				})] })]
			}),
			!isLoading && current === 0 && record > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs italic text-muted-foreground",
				children: "Allena oggi per ricostruire lo streak."
			}),
			!isLoading && current > 0 && current === record && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs font-semibold text-[oklch(0.55_0.16_145)]",
				children: "🏆 Nuovo record!"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-center gap-1.5 text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, { className: "h-3 w-3" }), " Questa settimana"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `font-semibold ${weeklyCount >= safeWeeklyGoal ? "text-[oklch(0.55_0.16_145)]" : "text-foreground"}`,
							children: [
								weeklyCount,
								"/",
								safeWeeklyGoal
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: String(safeWeeklyGoal),
							onValueChange: (v) => onChangeGoal(Number(v)),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								"aria-label": "Obiettivo settimanale",
								className: "h-7 w-auto rounded-full border px-2 text-xs font-semibold",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: [
								1,
								2,
								3,
								4,
								5,
								6,
								7
							].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
								value: String(n),
								children: [n, "/sett"]
							}, n)) })]
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 h-2 w-full overflow-hidden rounded-full bg-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full bg-primary transition-all",
						style: { width: `${ratio * 100}%` }
					})
				})]
			})
		]
	});
}
function computeStreak(completedAts) {
	if (completedAts.length === 0) return {
		current: 0,
		record: 0
	};
	const days = /* @__PURE__ */ new Set();
	for (const iso of completedAts) try {
		days.add(format(new Date(iso), "yyyy-MM-dd"));
	} catch {}
	const today = /* @__PURE__ */ new Date();
	const todayStr = format(today, "yyyy-MM-dd");
	const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");
	let cursor = null;
	if (days.has(todayStr)) cursor = today;
	else if (days.has(yesterdayStr)) cursor = subDays(today, 1);
	let current = 0;
	while (cursor && days.has(format(cursor, "yyyy-MM-dd"))) {
		current++;
		cursor = subDays(cursor, 1);
	}
	const sorted = [...days].sort();
	let record = sorted.length > 0 ? 1 : 0;
	let run = sorted.length > 0 ? 1 : 0;
	let prev = sorted.length > 0 ? new Date(sorted[0]) : null;
	for (let i = 1; i < sorted.length; i++) {
		const d = new Date(sorted[i]);
		if (prev && differenceInCalendarDays(d, prev) === 1) run++;
		else run = 1;
		if (run > record) record = run;
		prev = d;
	}
	return {
		current,
		record
	};
}
/**
* Skeleton per `/` (dashboard). Rispecchia la struttura reale della pagina
* in modo che il passaggio loading → loaded non causi salti di layout.
*/
function DashboardSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app animate-in fade-in pt-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-8 flex items-start justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-3 w-24" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-40" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-10 w-10 rounded-full" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-44 rounded-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-24 rounded-2xl" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-24 rounded-2xl" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mt-4 h-36 rounded-2xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mb-3 h-5 w-32" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 rounded-2xl" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 rounded-2xl" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 rounded-2xl" })
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mb-3 h-5 w-20" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-14 rounded-2xl" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-14 rounded-2xl" })]
				})]
			})
		]
	});
}
function Dashboard() {
	const { user, profile } = Route.useRouteContext();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const { display: fmtWeight } = useWeightUnit();
	const profileQ = useQuery({
		queryKey: ["profile", user.id],
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle();
			return data;
		}
	});
	const plansQ = useQuery({
		queryKey: ["plans", user.id],
		queryFn: async () => {
			const { data, error } = await supabase.from("plans").select("id, name").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3);
			if (error) throw error;
			return data ?? [];
		}
	});
	const weekQ = useQuery({
		queryKey: ["week-stats", user.id],
		queryFn: async () => {
			const now = /* @__PURE__ */ new Date();
			const thisStart = startOfWeek(now, { weekStartsOn: 1 });
			const thisEnd = endOfWeek(now, { weekStartsOn: 1 });
			const lastStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
			const lastEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
			const { data: sessions } = await supabase.from("sessions").select("id, started_at, completed_at, total_volume, plan_name").eq("user_id", user.id).not("completed_at", "is", null).gte("started_at", lastStart.toISOString()).lte("started_at", thisEnd.toISOString()).order("started_at", { ascending: false });
			const sessionsArr = sessions ?? [];
			const thisSessions = sessionsArr.filter((s) => new Date(s.started_at) >= thisStart);
			const lastSessions = sessionsArr.filter((s) => new Date(s.started_at) >= lastStart && new Date(s.started_at) <= lastEnd);
			const thisVolume = thisSessions.reduce((s, x) => s + Number(x.total_volume), 0);
			const lastVolume = lastSessions.reduce((s, x) => s + Number(x.total_volume), 0);
			const sessionIds = thisSessions.map((s) => s.id);
			let logs = [];
			if (sessionIds.length) {
				const { data } = await supabase.from("session_logs").select("muscle_group, reps, weight, session_id, created_at").in("session_id", sessionIds);
				logs = data ?? [];
			}
			const muscleMap = /* @__PURE__ */ new Map();
			logs.forEach((l) => {
				const m = l.muscle_group?.trim() || "Altro";
				muscleMap.set(m, (muscleMap.get(m) ?? 0) + 1);
			});
			const topMuscle = [...muscleMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
			const trainedDays = eachDayOfInterval({
				start: thisStart,
				end: thisEnd
			}).map((d) => ({
				date: d,
				trained: thisSessions.some((s) => isSameDay(new Date(s.started_at), d))
			}));
			const change = lastVolume > 0 ? (thisVolume - lastVolume) / lastVolume * 100 : thisVolume > 0 ? 100 : 0;
			return {
				workouts: thisSessions.length,
				volume: thisVolume,
				topMuscle,
				change,
				days: trainedDays,
				recent: thisSessions.slice(0, 3)
			};
		}
	});
	const streakQ = useQuery({
		queryKey: ["streak", user.id],
		queryFn: async () => {
			const since = subDays(/* @__PURE__ */ new Date(), 365);
			const { data, error } = await supabase.from("sessions").select("completed_at, total_volume").eq("user_id", user.id).not("completed_at", "is", null).gte("completed_at", since.toISOString());
			if (error) throw error;
			return data ?? [];
		}
	});
	const goalQ = useQuery({
		queryKey: ["weekly-goal", user.id],
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("weekly_goal").eq("id", user.id).maybeSingle();
			const goal = data?.weekly_goal;
			return typeof goal === "number" && goal >= 1 && goal <= 7 ? goal : 3;
		}
	});
	const setGoal = useMutation({
		mutationFn: async (n) => {
			const { error } = await supabase.from("profiles").update({ weekly_goal: n }).eq("id", user.id);
			if (error) throw error;
		},
		onSuccess: (_data, n) => {
			qc.invalidateQueries({ queryKey: ["weekly-goal", user.id] });
			toast.success(`Obiettivo settimanale impostato a ${n}`);
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Errore nel salvataggio");
		}
	});
	if (weekQ.isLoading || plansQ.isLoading || streakQ.isLoading || goalQ.isLoading || profileQ.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardSkeleton, {});
	const name = profileQ.data?.display_name || profile?.display_name || "Atleta";
	const stats = weekQ.data;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app pt-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-8 flex items-start justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
					children: format(/* @__PURE__ */ new Date(), "EEEE d MMM", { locale: it })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "mt-1 text-3xl font-black tracking-tight",
					children: ["Ciao, ", name.split(" ")[0]]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 pt-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PWAInstallButton, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: async () => {
							await supabase.auth.signOut();
							navigate({ to: "/auth" });
						},
						className: "rounded-full p-2 text-muted-foreground hover:text-foreground",
						"aria-label": "Esci",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-5 w-5" })
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-3xl bg-primary p-6 text-primary-foreground",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-semibold uppercase tracking-widest opacity-70",
						children: "Questa settimana"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 flex items-end justify-between",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-6xl font-black tracking-tighter",
							children: stats?.workouts ?? 0
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 grid grid-cols-7 gap-1.5",
						children: stats?.days.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `h-9 w-full rounded-lg ${d.trained ? "bg-primary-foreground" : "bg-primary-foreground/15"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] font-semibold uppercase opacity-60",
								children: format(d.date, "EEEEE", { locale: it })
							})]
						}, i))
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-4 grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Volume tot.",
					value: fmtWeight(stats?.volume ?? 0),
					trend: stats?.change ?? 0
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
					label: "Top muscolo",
					value: stats?.topMuscle ?? "—",
					icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-4 w-4" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreakCard, {
				sessions: streakQ.data ?? [],
				weeklyGoal: goalQ.data ?? 3,
				weeklyCount: stats?.workouts ?? 0,
				onChangeGoal: (n) => setGoal.mutate(n)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex items-baseline justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-bold",
						children: "Inizia un allenamento"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/schede",
						className: "text-xs font-semibold text-muted-foreground",
						children: "Tutte →"
					})]
				}), plansQ.data && plansQ.data.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/schede",
					className: "block rounded-2xl border-2 border-dashed border-border p-6 text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dumbbell, { className: "mx-auto h-6 w-6 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm font-semibold",
						children: "Crea la tua prima scheda"
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: plansQ.data?.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/allena/$planId",
						params: { planId: p.id },
						className: "no-tap-highlight flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 transition active:scale-[0.99]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dumbbell, { className: "h-4 w-4" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-semibold",
								children: p.name
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-5 w-5 text-muted-foreground" })]
					}, p.id))
				})]
			}),
			stats && stats.recent.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-3 text-lg font-bold",
					children: "Recenti"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: stats.recent.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-3.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-semibold",
							children: s.plan_name ?? "Allenamento"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: format(new Date(s.started_at), "EEE d MMM", { locale: it })
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-bold",
							children: fmtWeight(Number(s.total_volume), { digits: 0 })
						})]
					}, s.id))
				})]
			})
		]
	});
}
function StatCard({ label, value, trend, icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
					children: label
				}), icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-muted-foreground",
					children: icon
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 text-2xl font-black tracking-tight truncate",
				children: value
			}),
			trend !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `mt-1 flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? "text-[oklch(0.55_0.16_145)]" : "text-destructive"}`,
				children: [
					trend >= 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-3 w-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingDown, { className: "h-3 w-3" }),
					trend >= 0 ? "+" : "",
					trend.toFixed(0),
					"% vs settimana scorsa"
				]
			})
		]
	});
}
//#endregion
export { Dashboard as component };
