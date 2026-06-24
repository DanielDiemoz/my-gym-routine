import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { O as redirect, m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/route-DcgBjeMy.js
var $$splitComponentImporter = () => import("./route-C166Xm32.mjs");
var Route = createFileRoute("/_authenticated")({
	ssr: false,
	beforeLoad: async ({ location }) => {
		const { data, error } = await supabase.auth.getUser();
		if (error || !data.user) throw redirect({ to: "/auth" });
		const { data: profile, error: profileError } = await supabase.from("profiles").select("onboarded, display_name").eq("id", data.user.id).maybeSingle();
		if (profileError) console.error("Error fetching profile:", profileError);
		else if (!profile?.onboarded && !location.pathname.startsWith("/onboarding")) throw redirect({ to: "/onboarding" });
		return {
			user: data.user,
			profile
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
