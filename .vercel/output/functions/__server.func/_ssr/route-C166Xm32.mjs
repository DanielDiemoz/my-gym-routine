import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { P as useNavigate, f as Outlet, g as Link, l as useLocation } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as WeightUnitProvider } from "./useWeightUnit-6izDvxCm.mjs";
import { I as House, i as Users, w as Dumbbell, y as History } from "../_libs/lucide-react.mjs";
import { t as Route } from "./route-DcgBjeMy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/route-C166Xm32.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AuthLayout() {
	const { profile, user } = Route.useRouteContext();
	const loc = useLocation();
	const navigate = useNavigate();
	const needsOnboarding = !profile?.onboarded && !loc.pathname.startsWith("/onboarding");
	(0, import_react.useEffect)(() => {
		if (needsOnboarding) navigate({ to: "/onboarding" });
	}, [needsOnboarding, navigate]);
	if (needsOnboarding) return null;
	const showNav = !loc.pathname.startsWith("/onboarding") && !loc.pathname.startsWith("/allena/");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background pb-24",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeightUnitProvider, {
			userId: user.id,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
		}), showNav && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BottomNav, { pathname: loc.pathname })]
	});
}
function BottomNav({ pathname }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "container-app flex h-16 items-center justify-around pb-[env(safe-area-inset-bottom)]",
			children: [
				{
					to: "/",
					icon: House,
					label: "Oggi"
				},
				{
					to: "/schede",
					icon: Dumbbell,
					label: "Schede"
				},
				{
					to: "/storico",
					icon: History,
					label: "Storico"
				},
				{
					to: "/cerchia",
					icon: Users,
					label: "Cerchia"
				}
			].map((it) => {
				const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
				const Icon = it.icon;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: it.to,
					className: `no-tap-highlight flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: `h-5 w-5 ${active ? "stroke-[2.5]" : ""}` }), it.label]
				}, it.to);
			})
		})
	});
}
//#endregion
export { AuthLayout as component };
