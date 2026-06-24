import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { C as startOfWeek, M as endOfMonth, O as endOfWeek, a as startOfMonth, i as subDays, n as subWeeks, r as subMonths, t as it, v as format } from "../_libs/date-fns.mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as useWeightUnit } from "./useWeightUnit-6izDvxCm.mjs";
import { t as Skeleton } from "./skeleton-D9W9wFsj.mjs";
import { N as Calendar, O as ChevronRight, k as ChevronLeft } from "../_libs/lucide-react.mjs";
import { t as Route } from "./storico-CxRCfeBe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/storico-B2XVTL9V.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Skeleton per `/storico`. Riflette header + month-nav + volume chart + heat-map + lista sessioni.
*/
function StoricoSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app animate-in fade-in pt-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6 space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-3 w-20" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-32" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mb-6 h-16 rounded-2xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mb-6 h-48 rounded-2xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mb-6 h-72 rounded-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 rounded-2xl" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 rounded-2xl" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 rounded-2xl" })
				]
			})
		]
	});
}
var VolumeChart = (0, import_react.lazy)(() => import("./VolumeChart-SGy2g1eU.mjs").then((m) => ({ default: m.VolumeChart })));
var YearHeatMap = (0, import_react.lazy)(() => import("./YearHeatMap-B9LIlXBX.mjs").then((m) => ({ default: m.YearHeatMap })));
var ChartErrorBoundary = class extends import_react.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}
	static getDerivedStateFromError() {
		return { hasError: true };
	}
	componentDidCatch(err) {
		console.error("[ChartErrorBoundary]", err);
	}
	render() {
		if (this.state.hasError) return this.props.fallback ?? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex h-48 items-center justify-center rounded-2xl border border-border bg-card",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Grafico non disponibile."
			})
		});
		return this.props.children;
	}
};
function Storico() {
	const { user } = Route.useRouteContext();
	const [monthOffset, setMonthOffset] = (0, import_react.useState)(0);
	const month = subMonths(/* @__PURE__ */ new Date(), monthOffset);
	const from = startOfMonth(month);
	const to = endOfMonth(month);
	const q = useQuery({
		queryKey: [
			"history",
			user.id,
			from.toISOString()
		],
		queryFn: async () => {
			const { data, error } = await supabase.from("sessions").select("id, plan_name, started_at, completed_at, total_volume").eq("user_id", user.id).not("completed_at", "is", null).gte("started_at", from.toISOString()).lte("started_at", to.toISOString()).order("started_at", { ascending: false });
			if (error) throw error;
			return data ?? [];
		}
	});
	const yearQ = useQuery({
		queryKey: ["year-sessions", user.id],
		queryFn: async () => {
			const since = subDays(/* @__PURE__ */ new Date(), 365);
			const { data, error } = await supabase.from("sessions").select("id, completed_at, total_volume").eq("user_id", user.id).not("completed_at", "is", null).gte("completed_at", since.toISOString()).order("completed_at", { ascending: true });
			if (error) throw error;
			return data ?? [];
		}
	});
	const { display, unit, isLoading: unitLoading } = useWeightUnit();
	const chartData = (0, import_react.useMemo)(() => {
		if (!yearQ.data) return [];
		const sessions = yearQ.data.filter((s) => !!s.completed_at);
		const today = /* @__PURE__ */ new Date();
		const buckets = [];
		for (let i = 12; i >= 0; i--) {
			const ws = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
			const we = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
			const volume = sessions.filter((s) => {
				const d = new Date(s.completed_at);
				return d >= ws && d <= we;
			}).reduce((sum, s) => sum + Number(s.total_volume || 0), 0);
			buckets.push({
				week: format(ws, "d MMM", { locale: it }),
				range: `${format(ws, "d MMM", { locale: it })} – ${format(we, "d MMM", { locale: it })}`,
				volume
			});
		}
		return buckets;
	}, [yearQ.data]);
	const sessionsByDay = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		if (!yearQ.data) return map;
		for (const s of yearQ.data) {
			if (!s.completed_at) continue;
			const key = format(new Date(s.completed_at), "yyyy-MM-dd");
			map.set(key, (map.get(key) ?? 0) + Number(s.total_volume || 0));
		}
		return map;
	}, [yearQ.data]);
	if (q.isLoading || yearQ.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoricoSkeleton, {});
	if (q.isError && yearQ.isError) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app flex min-h-screen flex-col items-center justify-center text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground",
			children: "Impossibile caricare lo storico. Controlla la connessione e riprova."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			onClick: () => {
				q.refetch();
				yearQ.refetch();
			},
			className: "mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground",
			children: "Riprova"
		})]
	});
	const totalVolume = (q.data ?? []).reduce((s, x) => s + Number(x.total_volume), 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app pt-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
					children: "Cronologia"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 text-3xl font-black tracking-tight",
					children: "Storico"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-6 flex items-center justify-between rounded-2xl border border-border bg-card p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setMonthOffset((m) => m + 1),
						className: "rounded-full p-2 text-muted-foreground",
						"aria-label": "Mese precedente",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-5 w-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-center gap-2 text-sm font-bold capitalize",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-4 w-4" }), format(month, "MMMM yyyy", { locale: it })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 text-xs text-muted-foreground",
							children: [
								q.data?.length ?? 0,
								" allenamenti ·",
								" ",
								unitLoading ? "…" : display(totalVolume)
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setMonthOffset((m) => Math.max(0, m - 1)),
						disabled: monthOffset === 0,
						className: "rounded-full p-2 text-muted-foreground disabled:opacity-30",
						"aria-label": "Mese successivo",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-5 w-5" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-6 rounded-2xl border border-border bg-card p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-3 text-sm font-bold",
					children: "Volume per settimana"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartErrorBoundary, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-48 w-full rounded-xl" }),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeChart, {
						data: chartData,
						formatter: (kg) => display(kg)
					})
				}) })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-3 text-sm font-bold",
					children: "Il tuo anno"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartErrorBoundary, {
					fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-32 items-center justify-center rounded-2xl border border-border bg-card",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "Calendario non disponibile."
						})
					}),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
						fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-32 w-full rounded-xl" }),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(YearHeatMap, {
							sessionsByDay,
							unit
						})
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-2",
				children: [q.data?.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-semibold",
						children: s.plan_name ?? "Allenamento"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-0.5 text-xs text-muted-foreground capitalize",
						children: format(new Date(s.started_at), "EEEE d MMM, HH:mm", { locale: it })
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-right text-base font-black",
						children: display(Number(s.total_volume), { digits: 0 })
					})]
				}, s.id)), q.data?.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "py-12 text-center text-sm text-muted-foreground",
					children: "Nessun allenamento in questo mese."
				})]
			})
		]
	});
}
//#endregion
export { Storico as component };
