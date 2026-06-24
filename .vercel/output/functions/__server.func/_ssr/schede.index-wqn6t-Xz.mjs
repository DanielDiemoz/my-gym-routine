import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { P as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useQueryClient, n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as Skeleton } from "./skeleton-D9W9wFsj.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { O as ChevronRight, p as Plus, w as Dumbbell } from "../_libs/lucide-react.mjs";
import { t as Route } from "./schede.index-C7VAu3WU.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/schede.index-wqn6t-Xz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Skeleton per `/schede`. Riflette header + CTA + lista schede.
*/
function SchedeSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app animate-in fade-in pt-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6 space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-3 w-16" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-32" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mb-4 h-12 rounded-full" }),
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
function Schede() {
	const { user } = Route.useRouteContext();
	const qc = useQueryClient();
	const navigate = useNavigate();
	const [creating, setCreating] = (0, import_react.useState)(false);
	const [name, setName] = (0, import_react.useState)("");
	const plansQ = useQuery({
		queryKey: ["plans-all", user.id],
		queryFn: async () => {
			const { data, error } = await supabase.from("plans").select("id, name, exercises(count)").eq("user_id", user.id).order("created_at", { ascending: false });
			if (error) throw error;
			return data ?? [];
		}
	});
	async function createPlan() {
		if (!name.trim()) return;
		const { data, error } = await supabase.from("plans").insert({
			user_id: user.id,
			name: name.trim()
		}).select("id").single();
		if (error) {
			toast.error(error.message);
			return;
		}
		setName("");
		setCreating(false);
		qc.invalidateQueries({ queryKey: ["plans-all", user.id] });
		qc.invalidateQueries({ queryKey: ["plans", user.id] });
		navigate({
			to: "/schede/$planId",
			params: { planId: data.id }
		});
	}
	if (plansQ.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SchedeSkeleton, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app pt-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
					children: "Le tue"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 text-3xl font-black tracking-tight",
					children: "Schede"
				})]
			}),
			creating ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 rounded-2xl border border-border bg-card p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					autoFocus: true,
					value: name,
					onChange: (e) => setName(e.target.value),
					onKeyDown: (e) => e.key === "Enter" && createPlan(),
					placeholder: "Es. Push A, Full Body...",
					className: "w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-foreground"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							setCreating(false);
							setName("");
						},
						className: "flex-1 rounded-full border border-border py-3 text-sm font-semibold",
						children: "Annulla"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: createPlan,
						className: "flex-1 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground",
						children: "Crea"
					})]
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => setCreating(true),
				className: "no-tap-highlight mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Nuova scheda"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [plansQ.data?.map((p) => {
					const count = p.exercises?.[0]?.count ?? 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/schede/$planId",
						params: { planId: p.id },
						className: "no-tap-highlight flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 active:scale-[0.99]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex h-10 w-10 items-center justify-center rounded-full bg-muted",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dumbbell, { className: "h-4 w-4" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-semibold",
								children: p.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-muted-foreground",
								children: [
									count,
									" ",
									count === 1 ? "esercizio" : "esercizi"
								]
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-5 w-5 text-muted-foreground" })]
					}, p.id);
				}), plansQ.data?.length === 0 && !creating && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "py-12 text-center text-sm text-muted-foreground",
					children: "Nessuna scheda. Creane una per iniziare."
				})]
			})
		]
	});
}
//#endregion
export { Schede as component };
