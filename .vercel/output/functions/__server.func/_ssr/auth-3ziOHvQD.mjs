import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { P as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { P as ArrowLeft } from "../_libs/lucide-react.mjs";
import { n as useForm, t as u } from "../_libs/@hookform/resolvers+[...].mjs";
import { n as stringType, t as objectType } from "../_libs/zod.mjs";
import { i as Trigger, n as List, r as Root2, t as Content } from "../_libs/radix-ui__react-tabs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-3ziOHvQD.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Tabs = Root2;
var TabsList = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
	ref,
	className: cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className),
	...props
}));
TabsList.displayName = List.displayName;
var TabsTrigger = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
	ref,
	className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow", className),
	...props
}));
TabsTrigger.displayName = Trigger.displayName;
var TabsContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content, {
	ref,
	className: cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className),
	...props
}));
TabsContent.displayName = Content.displayName;
var usernameLoginSchema = objectType({
	username: stringType().trim().min(2, "Minimo 2 caratteri"),
	password: stringType().min(6, "Minimo 6 caratteri")
});
var emailSchema = objectType({
	email: stringType().trim().email("Email non valida"),
	password: stringType().min(6, "Minimo 6 caratteri")
});
var forgotSchema = objectType({ email: stringType().trim().email("Email non valida") });
function AuthPage() {
	const navigate = useNavigate();
	const [tab, setTab] = (0, import_react.useState)("email");
	const [mode, setMode] = (0, import_react.useState)("signup");
	const [forgot, setForgot] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setForgot(false);
	}, [tab]);
	function onLoginSuccess() {
		navigate({ to: "/" });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen flex-col bg-background",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "container-app flex flex-1 flex-col justify-center py-16",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-8",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-4xl font-black tracking-tighter",
						children: "GymBro"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted-foreground",
						children: forgot ? "Recupera la tua password." : mode === "login" ? "Bentornato. Continua dove ti sei fermato." : "Crea un account e inizia ad allenarti."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
					value: tab,
					onValueChange: (v) => setTab(v),
					className: "w-full",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
							className: "grid w-full grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "email",
								children: "Email"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "username",
								children: "Username (legacy)"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "username",
							className: "mt-6",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsernameForm, {
								mode,
								setMode,
								onSuccess: onLoginSuccess
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "email",
							className: "mt-6",
							children: forgot ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ForgotForm, { onBack: () => setForgot(false) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmailForm, {
								mode,
								setMode,
								onSuccess: onLoginSuccess,
								onForgot: () => setForgot(true)
							})
						})
					]
				}),
				!forgot && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setMode(mode === "login" ? "signup" : "login"),
					className: "no-tap-highlight mt-6 text-center text-sm text-muted-foreground",
					children: mode === "login" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						"Non hai un account?",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-semibold text-foreground",
							children: "Registrati"
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						"Hai già un account?",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-semibold text-foreground",
							children: "Accedi"
						})
					] })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 text-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "text-xs font-semibold text-muted-foreground hover:text-foreground",
						children: "Continua senza account"
					})
				})
			]
		})
	});
}
function UsernameForm({ mode, setMode, onSuccess }) {
	const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
		resolver: u(usernameLoginSchema),
		defaultValues: {
			username: "",
			password: ""
		}
	});
	async function onSubmit(values) {
		try {
			const virtualEmail = `${values.username.trim().toLowerCase()}@gymbro.local`;
			if (mode === "signup") {
				const { error } = await supabase.auth.signUp({
					email: virtualEmail,
					password: values.password,
					options: { emailRedirectTo: window.location.origin }
				});
				if (error) throw error;
				toast.success("Account creato. Benvenuto!");
			} else {
				const { error } = await supabase.auth.signInWithPassword({
					email: virtualEmail,
					password: values.password
				});
				if (error) throw error;
			}
			onSuccess();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Errore";
			toast.error(msg.includes("Invalid login") ? "Username o password errati" : msg);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit(onSubmit),
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground",
				children: "Modalità legacy: solo per account creati prima della migrazione email."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
				label: "Username",
				type: "text",
				autoComplete: "username",
				placeholder: "Il tuo username",
				registration: register("username"),
				error: errors.username?.message
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
				label: "Password",
				type: "password",
				autoComplete: mode === "login" ? "current-password" : "new-password",
				placeholder: "••••••••",
				registration: register("password"),
				error: errors.password?.message
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubmitButton, {
				loading: isSubmitting,
				children: mode === "login" ? "Accedi" : "Crea account"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setMode(mode === "login" ? "signup" : "login"),
				className: "no-tap-highlight mt-2 w-full text-center text-xs text-muted-foreground",
				children: mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"
			})
		]
	});
}
function EmailForm({ mode, setMode, onSuccess, onForgot }) {
	const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
		resolver: u(emailSchema),
		defaultValues: {
			email: "",
			password: ""
		}
	});
	async function onSubmit(values) {
		try {
			if (mode === "signup") {
				const { error } = await supabase.auth.signUp({
					email: values.email,
					password: values.password,
					options: { emailRedirectTo: window.location.origin }
				});
				if (error) throw error;
				toast.success("Account creato. Controlla la tua email per confermare.");
			} else {
				const { error } = await supabase.auth.signInWithPassword({
					email: values.email,
					password: values.password
				});
				if (error) throw error;
			}
			onSuccess();
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Errore";
			toast.error(msg.includes("Invalid login") ? "Email o password errati" : msg);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit(onSubmit),
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
				label: "Email",
				type: "email",
				autoComplete: "email",
				placeholder: "tu@example.com",
				registration: register("email"),
				error: errors.email?.message
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
				label: "Password",
				type: "password",
				autoComplete: mode === "login" ? "current-password" : "new-password",
				placeholder: "••••••••",
				registration: register("password"),
				error: errors.password?.message
			}),
			mode === "login" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onForgot,
				className: "block text-left text-xs font-semibold text-muted-foreground hover:text-foreground",
				children: "Password dimenticata?"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubmitButton, {
				loading: isSubmitting,
				children: mode === "login" ? "Accedi" : "Crea account"
			})
		]
	});
}
function ForgotForm({ onBack }) {
	const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
		resolver: u(forgotSchema),
		defaultValues: { email: "" }
	});
	const [sent, setSent] = (0, import_react.useState)(false);
	async function onSubmit(values) {
		try {
			const redirectTo = `${window.location.origin}/auth/reset`;
			const { error } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo });
			if (error) throw error;
			setSent(true);
			reset();
			toast.success("Controlla la tua email per il link di reset.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Errore");
		}
	}
	if (sent) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4 rounded-2xl border border-border bg-card p-6 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground",
				children: "✓"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold",
				children: "Email inviata"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: "Se l'indirizzo è registrato, riceverai un link per reimpostare la password."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onBack,
				className: "mt-2 inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), " Torna al login"]
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: handleSubmit(onSubmit),
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FormField, {
				label: "Email",
				type: "email",
				autoComplete: "email",
				placeholder: "tu@example.com",
				registration: register("email"),
				error: errors.email?.message
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubmitButton, {
				loading: isSubmitting,
				children: "Invia link di reset"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onBack,
				className: "block w-full text-center text-xs text-muted-foreground",
				children: "Torna al login"
			})
		]
	});
}
function FormField({ label, type, autoComplete, placeholder, registration, error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
			className: "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground",
			children: label
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type,
			autoComplete,
			placeholder,
			...registration,
			className: "w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none transition focus:border-foreground"
		}),
		error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1.5 text-xs font-semibold text-destructive",
			children: error
		})
	] });
}
function SubmitButton({ loading, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "submit",
		disabled: loading,
		className: "no-tap-highlight mt-4 flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60",
		children: loading ? "..." : children
	});
}
//#endregion
export { AuthPage as component };
