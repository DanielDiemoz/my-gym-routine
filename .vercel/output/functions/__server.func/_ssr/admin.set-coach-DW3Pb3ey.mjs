import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.set-coach-DW3Pb3ey.js
var $$splitComponentImporter = () => import("./admin.set-coach-Dmdu2H9g.mjs");
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
var Route = createFileRoute("/_authenticated/admin/set-coach")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
