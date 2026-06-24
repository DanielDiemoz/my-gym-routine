import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { i as useQueryClient, n as useQuery } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/useWeightUnit-6izDvxCm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KG_PER_LB = .45359243;
var LB_PER_KG = 2.2046226218;
var WeightUnitContext = (0, import_react.createContext)(null);
function WeightUnitProvider({ userId, children }) {
	const qc = useQueryClient();
	const q = useQuery({
		queryKey: ["profile", userId],
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("weight_unit").eq("id", userId).maybeSingle();
			return data?.weight_unit === "lbs" ? "lbs" : "kg";
		},
		staleTime: 1e3 * 60 * 5
	});
	const toggle = (0, import_react.useCallback)(async () => {
		const next = (q.data ?? "kg") === "kg" ? "lbs" : "kg";
		await supabase.from("profiles").update({ weight_unit: next }).eq("id", userId);
		qc.invalidateQueries({ queryKey: ["profile", userId] });
	}, [
		q.data,
		qc,
		userId
	]);
	const value = (0, import_react.useMemo)(() => {
		const unit = q.data ?? "kg";
		const convertFromKg = (kg) => unit === "kg" ? kg : kg * LB_PER_KG;
		const convertToKg = (val) => unit === "kg" ? val : val * KG_PER_LB;
		const display = (kg, opts) => {
			if (kg == null || !Number.isFinite(kg)) return "—";
			const digits = opts?.digits ?? (unit === "kg" ? 1 : 0);
			const converted = convertFromKg(kg);
			return `${digits === 0 ? Math.round(converted).toLocaleString("it-IT") : converted.toLocaleString("it-IT", {
				minimumFractionDigits: digits,
				maximumFractionDigits: digits
			})} ${unit}`;
		};
		return {
			unit,
			toggle,
			display,
			convertFromKg,
			convertToKg,
			isLoading: q.isLoading
		};
	}, [
		q.data,
		q.isLoading,
		toggle
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeightUnitContext.Provider, {
		value,
		children
	});
}
function useWeightUnit() {
	const v = (0, import_react.useContext)(WeightUnitContext);
	if (!v) throw new Error("useWeightUnit must be used inside a <WeightUnitProvider>");
	return v;
}
//#endregion
export { useWeightUnit as n, WeightUnitProvider as t };
