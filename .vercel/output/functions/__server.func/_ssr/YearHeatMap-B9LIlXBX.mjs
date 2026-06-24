import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as DayPicker } from "../_libs/react-day-picker.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/YearHeatMap-B9LIlXBX.js
var import_jsx_runtime = require_jsx_runtime();
/**
* Heat-map annuale (ultimi 365 giorni) per GymBro.
* - Usa `react-day-picker` v9 in modalità visualizzazione (mode="single" con onSelect no-op).
* - Tre bucket (lowVolume / medVolume / highVolume) basati sul rapporto volume/max.
* - Opacity 30% / 60% / 100% via modifiersStyles.
*/
function YearHeatMap({ sessionsByDay, unit = "kg" }) {
	const max = sessionsByDay.size > 0 ? Math.max(...sessionsByDay.values()) : 0;
	const low = [];
	const med = [];
	const high = [];
	sessionsByDay.forEach((volume, dayStr) => {
		const d = /* @__PURE__ */ new Date(`${dayStr}T00:00:00`);
		if (Number.isNaN(d.getTime())) return;
		if (max === 0) {
			low.push(d);
			return;
		}
		const ratio = volume / max;
		if (ratio < .33) low.push(d);
		else if (ratio < .66) med.push(d);
		else high.push(d);
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-3xl border border-border bg-card p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DayPicker, {
			mode: "single",
			selected: void 0,
			onSelect: () => {},
			showOutsideDays: true,
			modifiers: {
				lowVolume: low,
				medVolume: med,
				highVolume: high
			},
			modifiersStyles: {
				lowVolume: {
					backgroundColor: "var(--primary)",
					color: "var(--primary-foreground)",
					borderRadius: 6,
					opacity: .3
				},
				medVolume: {
					backgroundColor: "var(--primary)",
					color: "var(--primary-foreground)",
					borderRadius: 6,
					opacity: .6
				},
				highVolume: {
					backgroundColor: "var(--primary)",
					color: "var(--primary-foreground)",
					borderRadius: 6,
					opacity: 1
				}
			}
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-3 flex items-center justify-end gap-2 text-[10px] uppercase tracking-widest text-muted-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Meno ", unit] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					"aria-hidden": true,
					className: "h-3 w-3 rounded",
					style: {
						backgroundColor: "var(--primary)",
						opacity: .3
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					"aria-hidden": true,
					className: "h-3 w-3 rounded",
					style: {
						backgroundColor: "var(--primary)",
						opacity: .6
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					"aria-hidden": true,
					className: "h-3 w-3 rounded",
					style: {
						backgroundColor: "var(--primary)",
						opacity: 1
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Più ", unit] })
			]
		})]
	});
}
//#endregion
export { YearHeatMap };
