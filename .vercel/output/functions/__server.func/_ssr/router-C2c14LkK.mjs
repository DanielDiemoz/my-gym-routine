import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { F as useRouter, O as redirect, c as HeadContent, d as createRouter, f as Outlet, h as createRootRouteWithContext, m as createFileRoute, p as lazyRouteComponent, s as Scripts } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Route$3 } from "../_authenticated-DHrY2awB.mjs";
import { n as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { r as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as Route$4 } from "./admin.set-coach-DW3Pb3ey.mjs";
import { t as Route$5 } from "./allena._planId-CXgpBNAd.mjs";
import { n as stringType, t as objectType } from "../_libs/zod.mjs";
import { t as Route$6 } from "./cerchia._circleId-CdvqwC59.mjs";
import { t as Route$7 } from "./cerchia.index-DBrrOs2n.mjs";
import { t as Route$8 } from "./onboarding-C-nB1tCs.mjs";
import { t as Route$9 } from "./route-DcgBjeMy.mjs";
import { t as Route$10 } from "./storico-CxRCfeBe.mjs";
import { t as Route$11 } from "./schede.index-C7VAu3WU.mjs";
import { t as Route$12 } from "./schede._planId-CP8Sd1mJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-C2c14LkK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-CwBx0uiN.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-sm text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-6xl font-bold tracking-tight",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted-foreground",
					children: "Pagina non trovata."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "/",
					className: "mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground",
					children: "Torna alla home"
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-sm text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold",
					children: "Qualcosa è andato storto"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Riprova oppure torna alla home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground",
						children: "Riprova"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "rounded-full border border-border px-5 py-2.5 text-sm font-semibold",
						children: "Home"
					})]
				})
			]
		})
	});
}
var Route$2 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover"
			},
			{
				name: "theme-color",
				content: "#0a0a0a"
			},
			{ title: "GymBro — Allenamento essenziale" },
			{
				name: "description",
				content: "GymBro: crea schede, allenati e tieni traccia dei tuoi progressi settimanali."
			},
			{
				property: "og:title",
				content: "GymBro"
			},
			{
				property: "og:description",
				content: "Crea schede, allenati e tieni traccia dei tuoi progressi."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes"
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/icons/icon-192.png"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "it",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$2.useRouteContext();
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((event) => {
			if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
			router.invalidate();
			if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
		});
		return () => {
			sub.subscription.unsubscribe();
		};
	}, [router, queryClient]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, { position: "top-center" })]
	});
}
var $$splitComponentImporter$1 = () => import("./auth-3ziOHvQD.mjs");
var Route$1 = createFileRoute("/auth")({
	ssr: false,
	beforeLoad: async () => {
		const { data } = await supabase.auth.getUser();
		if (data.user) throw redirect({ to: "/" });
	},
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
objectType({
	username: stringType().trim().min(2, "Minimo 2 caratteri"),
	password: stringType().min(6, "Minimo 6 caratteri")
});
objectType({
	email: stringType().trim().email("Email non valida"),
	password: stringType().min(6, "Minimo 6 caratteri")
});
objectType({ email: stringType().trim().email("Email non valida") });
var $$splitComponentImporter = () => import("./auth.reset-C27tIttd.mjs");
var Route = createFileRoute("/auth/reset")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
objectType({
	password: stringType().min(6, "Minimo 6 caratteri"),
	confirm: stringType()
}).refine((data) => data.password === data.confirm, {
	message: "Le password non coincidono",
	path: ["confirm"]
});
var AuthRoute = Route$1.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$2
});
var AuthenticatedRouteRoute = Route$9.update({
	id: "/_authenticated",
	getParentRoute: () => Route$2
});
var AuthenticatedIndexRoute = Route$3.update({
	id: "/",
	path: "/",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthResetRoute = Route.update({
	id: "/reset",
	path: "/reset",
	getParentRoute: () => AuthRoute
});
var AuthenticatedStoricoRoute = Route$10.update({
	id: "/storico",
	path: "/storico",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedOnboardingRoute = Route$8.update({
	id: "/onboarding",
	path: "/onboarding",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedSchedeIndexRoute = Route$11.update({
	id: "/schede/",
	path: "/schede/",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedCerchiaIndexRoute = Route$7.update({
	id: "/cerchia/",
	path: "/cerchia/",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedSchedePlanIdRoute = Route$12.update({
	id: "/schede/$planId",
	path: "/schede/$planId",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedCerchiaCircleIdRoute = Route$6.update({
	id: "/cerchia/$circleId",
	path: "/cerchia/$circleId",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedAllenaPlanIdRoute = Route$5.update({
	id: "/allena/$planId",
	path: "/allena/$planId",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedRouteRouteChildren = {
	AuthenticatedOnboardingRoute,
	AuthenticatedStoricoRoute,
	AuthenticatedIndexRoute,
	AuthenticatedAdminSetCoachRoute: Route$4.update({
		id: "/admin/set-coach",
		path: "/admin/set-coach",
		getParentRoute: () => AuthenticatedRouteRoute
	}),
	AuthenticatedAllenaPlanIdRoute,
	AuthenticatedCerchiaCircleIdRoute,
	AuthenticatedSchedePlanIdRoute,
	AuthenticatedCerchiaIndexRoute,
	AuthenticatedSchedeIndexRoute
};
var AuthenticatedRouteRouteWithChildren = AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren);
var AuthRouteChildren = { AuthResetRoute };
var rootRouteChildren = {
	AuthenticatedRouteRoute: AuthenticatedRouteRouteWithChildren,
	AuthRoute: AuthRoute._addFileChildren(AuthRouteChildren)
};
var routeTree = Route$2._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient({ defaultOptions: {
			queries: {
				throwOnError: false,
				retry: 1
			},
			mutations: { throwOnError: false }
		} }) },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
