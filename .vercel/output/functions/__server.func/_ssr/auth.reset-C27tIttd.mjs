import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { P as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { L as CircleCheck, P as ArrowLeft } from "../_libs/lucide-react.mjs";
import { n as useForm, t as u } from "../_libs/@hookform/resolvers+[...].mjs";
import { n as stringType, t as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth.reset-C27tIttd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var resetSchema = objectType({
	password: stringType().min(6, "Minimo 6 caratteri"),
	confirm: stringType()
}).refine((data) => data.password === data.confirm, {
	message: "Le password non coincidono",
	path: ["confirm"]
});
function AuthResetPage() {
	const navigate = useNavigate();
	const [ready, setReady] = (0, import_react.useState)(false);
	const [hasSession, setHasSession] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		(async () => {
			const hash = window.location.hash;
			if (!hash.includes("access_token") && !hash.includes("type=recovery")) {
				toast.error("Link di reset non valido o scaduto.");
				navigate({ to: "/auth" });
				return;
			}
			const { data, error } = await supabase.auth.getSession();
			if (cancelled) return;
			if (error || !data.session) setHasSession(false);
			else setHasSession(true);
			setReady(true);
		})();
		return () => {
			cancelled = true;
		};
	}, [navigate]);
	function onSessionChange(_event, session) {
		if (session?.user) setHasSession(true);
	}
	(0, import_react.useEffect)(() => {
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === "PASSWORD_RECOVERY" || session?.user && !hasSession) onSessionChange(event, session);
		});
		return () => subscription.unsubscribe();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen flex-col bg-background",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "container-app flex flex-1 flex-col justify-center py-16",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/auth",
					className: "mb-8 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), " Login"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-4xl font-black tracking-tighter",
						children: "Reset password"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted-foreground",
						children: "Imposta una nuova password per il tuo account."
					})]
				}),
				!ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Verifica link in corso…"
				}) : !hasSession ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-destructive/40 bg-card p-6 text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-semibold text-destructive",
						children: "Link di reset non valido o scaduto."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/auth",
						className: "mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground",
						children: "Torna al login"
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewPasswordForm, { onDone: () => {
					toast.success("Password aggiornata. Ora accedi.");
					navigate({ to: "/auth" });
				} })
			]
		})
	});
}
function NewPasswordForm({ onDone }) {
	const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
		resolver: u(resetSchema),
		defaultValues: {
			password: "",
			confirm: ""
		}
	});
	const [done, setDone] = (0, import_react.useState)(false);
	async function onSubmit(values) {
		try {
			const { error } = await supabase.auth.updateUser({ password: values.password });
			if (error) throw error;
			setDone(true);
			await supabase.auth.signOut();
			setTimeout(onDone, 800);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Errore");
		}
	}
	if (done) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card p-6 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "mx-auto h-12 w-12 text-primary" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm font-semibold",
				children: "Password aggiornata"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-muted-foreground",
				children: "Verrai reindirizzato al login…"
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit(onSubmit),
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Nuova password",
				type: "password",
				registration: register("password"),
				error: errors.password?.message,
				autoComplete: "new-password"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Conferma password",
				type: "password",
				registration: register("confirm"),
				error: errors.confirm?.message,
				autoComplete: "new-password"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "submit",
				disabled: isSubmitting,
				className: "no-tap-highlight mt-4 flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60",
				children: isSubmitting ? "..." : "Aggiorna password"
			})
		]
	});
}
function Field({ label, type, registration, error, autoComplete }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
			className: "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground",
			children: label
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type,
			autoComplete,
			...registration,
			className: "w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none transition focus:border-foreground"
		}),
		error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1.5 text-xs font-semibold text-destructive",
			children: error
		})
	] });
}
//#endregion
export { AuthResetPage as component };
