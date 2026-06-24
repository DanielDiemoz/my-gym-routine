import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { P as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useQueryClient } from "../_libs/tanstack__react-query.mjs";
import { F as TriangleAlert, P as ArrowLeft, d as ShieldCheck } from "../_libs/lucide-react.mjs";
import { t as Route } from "./admin.set-coach-DW3Pb3ey.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.set-coach-Dmdu2H9g.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Pagina admin — TASK 6.
* Endpoint "segreto" per promuovere un utente a coach.
* - Si accede via URL `/admin/set-coach?userId=<UUID>&secret=GYMBRO_ADMIN_2024`.
* - Se il segreto è errato → redirect a "/".
* - Se corretto → UPDATE profiles SET role = 'coach' WHERE id = <userId>.
*
* ⚠️ ATTENZIONE — Questo è solo un workaround temporaneo per ambienti dev.
* In produzione questa operazione DEVE essere protetta lato server
* (es. Edge Function Supabase con service_role key, gated da un sistema di
* autenticazione admin robusto). L'uso della secret in chiaro nell'URL e
* dell'update client-side NON È SICURO e NON scala.
*/
var ADMIN_SECRET = "GYMBRO_ADMIN_2024";
function SetCoachPage() {
	const navigate = useNavigate();
	const search = Route.useSearch();
	const userId = search?.userId?.trim();
	const secret = search?.secret;
	(0, import_react.useEffect)(() => {
		if (secret !== ADMIN_SECRET) {
			console.warn("[admin] secret non valida → redirect /");
			navigate({ to: "/" });
		}
	}, [secret, navigate]);
	if (secret !== ADMIN_SECRET) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PromoteFlow, { userId });
}
function PromoteFlow({ userId }) {
	const qc = useQueryClient();
	const [status, setStatus] = (0, import_react.useState)("checking");
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!userId) {
			setStatus("error");
			setError("Parametro userId mancante. Aggiungi ?userId=<UUID> all'URL.");
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				setStatus("running");
				const { error: updateErr } = await supabase.from("profiles").update({ role: "coach" }).eq("id", userId);
				if (cancelled) return;
				if (updateErr) throw updateErr;
				setStatus("done");
				qc.invalidateQueries({ queryKey: ["profile-role", userId] });
				qc.invalidateQueries({ queryKey: ["circles", userId] });
			} catch (err) {
				if (cancelled) return;
				setStatus("error");
				setError(err instanceof Error ? err.message : "Errore");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [userId, qc]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app flex min-h-screen flex-col py-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/",
				className: "mb-8 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), " Dashboard"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-6 flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-6 w-6" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
					children: "Admin · Promozione coach"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-black tracking-tight",
					children: "Set role"
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 rounded-2xl border border-border bg-card p-6",
				children: [
					status === "checking" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Recupero utente…"
					}),
					status === "running" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Aggiornamento in corso…"
					}),
					status === "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
							children: "✓"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-base font-bold",
								children: "Utente promosso a coach ✅"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: "Aggiorna il profilo o ricarica la pagina per vedere le funzioni coach."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("code", {
								className: "mt-3 inline-block break-all rounded-lg bg-muted px-2 py-1 text-[10px] text-muted-foreground",
								children: ["userId: ", userId]
							})
						] })]
					}),
					status === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-5 w-5 shrink-0 text-destructive" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-semibold text-destructive",
								children: "Operazione fallita"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: [error ?? "Errore sconosciuto.", " Le policy RLS potrebbero bloccare l'update client-side: nel dubbio, promuovi via SQL Editor di Supabase:"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
								className: "mt-3 overflow-x-auto rounded-lg bg-muted px-2 py-1 text-[10px] text-muted-foreground",
								children: `UPDATE profiles SET role = 'coach' WHERE id = '${userId}';`
							})
						] })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-[10px] uppercase tracking-widest text-muted-foreground",
				children: "⚠️ Pagina solo dev. Mai esporre in produzione senza protezione server-side."
			})
		]
	});
}
//#endregion
export { SetCoachPage as component };
