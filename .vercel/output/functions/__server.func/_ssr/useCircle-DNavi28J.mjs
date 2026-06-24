import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { A as Check, T as Copy } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/useCircle-DNavi28J.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Bottone "Copia codice" usato sia nella card della cerchia appena creata
* sia nel pannello codice invito nella pagina di dettaglio.
*
* La logica di copia è centralizzata qui perché 3 implementazioni separate
* (CodeBadge, vecchio CopyButton inline, CopyButtonInline) divergevano e
* diventavano un bug-magnet. Questo componente è il single source of truth.
*/
function CopyCodeButton({ text, label = "Copia codice", size = "md", className, onCopy }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	const iconDim = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick: () => {
			navigator.clipboard.writeText(text).then(() => {
				setCopied(true);
				toast.success("Codice copiato!");
				onCopy?.();
				setTimeout(() => setCopied(false), 1500);
			}).catch(() => toast.error("Copia non riuscita"));
		},
		className: cn("flex items-center gap-1.5 rounded-full border border-border bg-background font-bold uppercase tracking-widest hover:bg-muted", size === "sm" ? "px-3 py-1.5 text-[10px]" : "px-4 py-2 text-xs", className),
		children: [copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: iconDim }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: iconDim }), copied ? "Copiato" : label]
	});
}
/**
* useCircle.ts
* Hook centralizzato per la feature "Cerchie".
*
* Espone:
*   - myCircles     : cerchie di cui l'utente è membro (o owner)
*   - isCoach       : true se profiles.role === 'coach'
*   - joinCircle    : entra in una cerchia tramite codice
*   - createCircle  : crea nuova cerchia (solo coach)
*   - leaveCircle   : esci da una cerchia
*   - deleteCircle  : elimina una cerchia (solo owner)
*/
var fromCircles = () => supabase.from("circles");
var fromCircleMembers = () => supabase.from("circle_members");
var CIRCLES_KEY = (userId) => ["circles", userId];
var ROLE_KEY = (userId) => ["profile-role", userId];
function useCircle(userId) {
	const qc = useQueryClient();
	const circlesQ = useQuery({
		queryKey: CIRCLES_KEY(userId),
		queryFn: async () => {
			const { data, error } = await supabase.rpc("get_my_circles");
			if (error) throw new Error(error.message || "Errore nel caricamento delle cerchie");
			return data ?? [];
		},
		staleTime: 1e3 * 30
	});
	const roleQ = useQuery({
		queryKey: ROLE_KEY(userId),
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
			return data?.role === "coach" ? "coach" : "user";
		},
		staleTime: 1e3 * 60 * 5
	});
	const invalidateCircles = () => qc.invalidateQueries({ queryKey: CIRCLES_KEY(userId) });
	const joinMut = useMutation({
		mutationFn: async (code) => {
			const { data: circleId, error } = await supabase.rpc("join_circle_by_code", { invite_code: code });
			if (error) throw new Error(error.message || "Errore durante l'accesso");
			if (!circleId) throw new Error("Risposta RPC non valida.");
			return circleId;
		},
		onSuccess: () => {
			toast.success("Sei entrato nella cerchia!");
			invalidateCircles();
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Errore durante l'accesso");
		}
	});
	const createMut = useMutation({
		mutationFn: async (name) => {
			const { data: newCircle, error } = await supabase.rpc("create_circle_as_coach", { circle_name: name });
			if (error) throw new Error(error.message || "Errore durante la creazione");
			if (!newCircle) throw new Error("Creazione cerchia fallita");
			return newCircle;
		},
		onSuccess: () => {
			invalidateCircles();
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Errore durante la creazione");
		}
	});
	const leaveMut = useMutation({
		mutationFn: async (circleId) => {
			const { error } = await fromCircleMembers().delete().eq("circle_id", circleId).eq("user_id", userId);
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Hai lasciato la cerchia.");
			invalidateCircles();
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Errore");
		}
	});
	const deleteMut = useMutation({
		mutationFn: async (circleId) => {
			const { error } = await fromCircles().delete().eq("id", circleId);
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Cerchia eliminata.");
			invalidateCircles();
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Errore durante l'eliminazione");
		}
	});
	return {
		/** Cerchie di cui l'utente è membro o owner */
		myCircles: circlesQ.data ?? [],
		isLoadingCircles: circlesQ.isLoading,
		/** true se l'utente ha ruolo coach */
		isCoach: roleQ.data === "coach",
		isLoadingRole: roleQ.isLoading,
		/** Entra in una cerchia tramite codice di 6 caratteri */
		joinCircle: (code) => joinMut.mutateAsync(code),
		isJoining: joinMut.isPending,
		/** Crea una nuova cerchia (solo coach). Restituisce la cerchia creata. */
		createCircle: (name) => createMut.mutateAsync(name),
		isCreating: createMut.isPending,
		/** Esci da una cerchia */
		leaveCircle: (circleId) => leaveMut.mutateAsync(circleId),
		isLeaving: leaveMut.isPending,
		/** Elimina una cerchia (solo owner) */
		deleteCircle: (circleId) => deleteMut.mutateAsync(circleId),
		isDeleting: deleteMut.isPending
	};
}
//#endregion
export { useCircle as n, CopyCodeButton as t };
