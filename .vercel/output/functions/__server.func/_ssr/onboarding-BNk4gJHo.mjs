import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { P as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { j as Camera } from "../_libs/lucide-react.mjs";
import { t as Route } from "./onboarding-C-nB1tCs.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/onboarding-BNk4gJHo.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Switch = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") })
}));
Switch.displayName = Switch$1.displayName;
function Onboarding() {
	const { user } = Route.useRouteContext();
	const navigate = useNavigate();
	const [name, setName] = (0, import_react.useState)("");
	const [avatarUrl, setAvatarUrl] = (0, import_react.useState)("");
	const [uploading, setUploading] = (0, import_react.useState)(false);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [unit, setUnit] = (0, import_react.useState)("kg");
	async function handleAvatar(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		try {
			const ext = file.name.split(".").pop();
			const path = `${user.id}/avatar.${ext}`;
			const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
			if (error) throw error;
			const { data } = supabase.storage.from("avatars").getPublicUrl(path);
			setAvatarUrl(data.publicUrl);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Errore upload");
		} finally {
			setUploading(false);
		}
	}
	async function save() {
		if (!name.trim()) {
			toast.error("Inserisci il tuo nome");
			return;
		}
		setSaving(true);
		const { error } = await supabase.from("profiles").upsert({
			id: user.id,
			display_name: name.trim(),
			avatar_url: avatarUrl || null,
			onboarded: true,
			weight_unit: unit
		});
		if (error) {
			toast.error(error.message);
			setSaving(false);
			return;
		}
		navigate({ to: "/" });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app flex min-h-screen flex-col py-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
					children: "Benvenuto"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 text-3xl font-black tracking-tight",
					children: "Configura il tuo profilo"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Solo due cose per iniziare."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-12 flex flex-col items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "relative h-28 w-28 cursor-pointer overflow-hidden rounded-full border border-border bg-muted",
					children: [avatarUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: avatarUrl,
						alt: "Avatar",
						className: "h-full w-full object-cover"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-full w-full items-center justify-center text-muted-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "h-7 w-7" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "file",
						accept: "image/*",
						className: "hidden",
						onChange: handleAvatar,
						disabled: uploading
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs text-muted-foreground",
					children: uploading ? "Caricamento..." : "Foto profilo (opzionale)"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground",
					children: "Come ti chiami"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					type: "text",
					value: name,
					onChange: (e) => setName(e.target.value),
					className: "w-full rounded-2xl border border-border bg-card px-4 py-4 text-base outline-none transition focus:border-foreground",
					placeholder: "Il tuo nome",
					autoFocus: true
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 rounded-2xl border border-border bg-card p-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-semibold",
						children: "Unità di misura"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-0.5 text-xs text-muted-foreground",
						children: "Come vuoi registrare i pesi?"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `text-xs font-semibold ${unit === "kg" ? "text-foreground" : "text-muted-foreground"}`,
								children: "kg"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
								checked: unit === "lbs",
								onCheckedChange: (v) => setUnit(v ? "lbs" : "kg"),
								"aria-label": "Cambia unità di misura"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: `text-xs font-semibold ${unit === "lbs" ? "text-foreground" : "text-muted-foreground"}`,
								children: "lbs"
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-auto pt-12",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: save,
					disabled: saving,
					className: "no-tap-highlight w-full rounded-full bg-primary py-4 text-base font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-60",
					children: saving ? "..." : "Inizia"
				})
			})
		]
	});
}
//#endregion
export { Onboarding as component };
