import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { a as ResponsiveContainer, i as Bar, n as YAxis, o as Tooltip, r as XAxis, t as BarChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/VolumeChart-SGy2g1eU.js
var import_jsx_runtime = require_jsx_runtime();
/**
* BarChart del volume settimanale GymBro (ultimi ~3 mesi).
* - Background trasparente
* - Assi in `var(--muted-foreground)` via `tick.fill`
* - Bar color: `var(--primary)`
* - Tooltip card design-system (bg-card, border-border, rounded-xl)
*/
function VolumeChart({ data, formatter }) {
	if (!data.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex h-48 items-center justify-center rounded-2xl border border-border bg-card",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground",
			children: "Completa qualche allenamento per vedere il grafico."
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-48 w-full",
		role: "img",
		"aria-label": `Grafico del volume settimanale in chilogrammi, ultimi ${data.length} periodi.`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
			width: "100%",
			height: "100%",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
				data,
				margin: {
					top: 8,
					right: 0,
					bottom: 0,
					left: 0
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
						dataKey: "week",
						tick: {
							fill: "var(--muted-foreground)",
							fontSize: 11
						},
						axisLine: false,
						tickLine: false
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
						tick: {
							fill: "var(--muted-foreground)",
							fontSize: 11
						},
						axisLine: false,
						tickLine: false,
						width: 36
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
						content: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeTooltip, { formatter }),
						cursor: {
							fill: "var(--muted)",
							opacity: .5
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
						dataKey: "volume",
						fill: "var(--primary)",
						radius: [
							6,
							6,
							0,
							0
						]
					})
				]
			})
		})
	});
}
function VolumeTooltip({ active, payload, formatter }) {
	if (!active || !payload?.length) return null;
	const item = payload[0].payload;
	const label = formatter ? formatter(item.volume) : `${Math.round(item.volume).toLocaleString("it-IT")} kg`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-bold",
			children: item.range
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted-foreground",
			children: label
		})]
	});
}
//#endregion
export { VolumeChart };
