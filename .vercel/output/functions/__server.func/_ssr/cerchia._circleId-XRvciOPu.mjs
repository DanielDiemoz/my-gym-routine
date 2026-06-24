import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { C as startOfWeek, F as startOfDay, _ as formatDistanceToNow, i as subDays, t as it, v as format } from "../_libs/date-fns.mjs";
import { t as supabase } from "./client-Ya_BWEKn.mjs";
import { P as useNavigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as useWeightUnit } from "./useWeightUnit-6izDvxCm.mjs";
import { t as Skeleton } from "./skeleton-D9W9wFsj.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { O as ChevronLeft, _ as LogOut, a as Trophy, c as Trash2, i as Users, k as ChevronDown } from "../_libs/lucide-react.mjs";
import { l as useConfirmDialog } from "./useConfirmDialog-Dl4MI-Wg.mjs";
import { t as Route } from "./cerchia._circleId-Dyrr7hOy.mjs";
import { n as useCircle, t as CopyCodeButton } from "./useCircle-DNavi28J.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cerchia._circleId-XRvciOPu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Pagina di dettaglio di una singola cerchia — TASK 5.
* - Header con nome, numero membri, codice (se owner), CTA Esci / Elimina.
* - Sezione Membri: avatar + display_name + 🔥 streak + volume settimanale,
*   ordinati per volume settimanale DESC.
* - Sezione Feed: ultimi 20 allenamenti (tutti i membri) ordinati per
*   completed_at DESC, accordion (una card aperta alla volta).
*/
function CircleDetailPage() {
	const { circleId } = Route.useParams();
	const { user } = Route.useRouteContext();
	const navigate = useNavigate();
	const { display: fmtWeight } = useWeightUnit();
	const { confirm: confirmDialog, ConfirmDialog } = useConfirmDialog();
	const { leaveCircle, isLeaving, deleteCircle, isDeleting } = useCircle(user.id);
	const detailQ = useQuery({
		queryKey: ["circle-detail", circleId],
		queryFn: async () => {
			const { data: circle, error: cErr } = await supabase.from("circles").select("id, name, code, owner_id, created_at").eq("id", circleId).maybeSingle();
			if (cErr) throw cErr;
			if (!circle) throw new Error("Cerchia non trovata o non accessibile.");
			const { data: rawIds, error: mErr } = await supabase.rpc("get_circle_members", { p_circle_id: circleId });
			if (mErr) throw mErr;
			const userIds = rawIds ?? [];
			if (userIds.length === 0) return {
				circle,
				profiles: [],
				sessions: [],
				feedLogs: []
			};
			const profiles = (await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)).data ?? [];
			const sinceIso = subDays(/* @__PURE__ */ new Date(), 365).toISOString();
			const sessions = (await supabase.from("sessions").select("id, user_id, plan_name, completed_at, total_volume").in("user_id", userIds).not("completed_at", "is", null).gte("completed_at", sinceIso)).data ?? [];
			const topIds = [...sessions].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()).slice(0, 20).map((s) => s.id);
			let feedLogs = [];
			if (topIds.length > 0) feedLogs = (await supabase.from("session_logs").select("id, session_id, exercise_name, set_number, reps, weight").in("session_id", topIds)).data ?? [];
			return {
				circle,
				profiles,
				sessions,
				feedLogs
			};
		},
		staleTime: 1e3 * 30
	});
	(0, import_react.useEffect)(() => {
		if (detailQ.isError) {
			toast.error(detailQ.error instanceof Error ? detailQ.error.message : "Errore");
			navigate({ to: "/cerchia" });
		}
	}, [
		detailQ.isError,
		detailQ.error,
		navigate
	]);
	const isOwner = !!detailQ.data && detailQ.data.circle.owner_id === user.id;
	const memberStats = (0, import_react.useMemo)(() => {
		if (!detailQ.data) return /* @__PURE__ */ new Map();
		const { profiles, sessions } = detailQ.data;
		const weekStart = startOfWeek(/* @__PURE__ */ new Date(), { weekStartsOn: 1 });
		const stats = /* @__PURE__ */ new Map();
		const datesByUser = /* @__PURE__ */ new Map();
		for (const s of sessions) {
			const d = new Date(s.completed_at);
			if (d >= weekStart) {
				const stat = stats.get(s.user_id) ?? {
					weeklyVolume: 0,
					streakDays: 0
				};
				stat.weeklyVolume += Number(s.total_volume || 0);
				stats.set(s.user_id, stat);
			}
			const key = format(d, "yyyy-MM-dd");
			const set = datesByUser.get(s.user_id) ?? /* @__PURE__ */ new Set();
			set.add(key);
			datesByUser.set(s.user_id, set);
		}
		const today = startOfDay(/* @__PURE__ */ new Date());
		for (const [userId, daySet] of datesByUser) {
			let cursor = today;
			if (!daySet.has(format(cursor, "yyyy-MM-dd"))) cursor = subDays(cursor, 1);
			let streak = 0;
			while (daySet.has(format(cursor, "yyyy-MM-dd"))) {
				streak += 1;
				cursor = subDays(cursor, 1);
			}
			const stat = stats.get(userId) ?? {
				weeklyVolume: 0,
				streakDays: 0
			};
			stat.streakDays = streak;
			stats.set(userId, stat);
		}
		for (const p of profiles) if (!stats.has(p.id)) stats.set(p.id, {
			weeklyVolume: 0,
			streakDays: 0
		});
		return stats;
	}, [detailQ.data]);
	const sortedMembers = (0, import_react.useMemo)(() => {
		if (!detailQ.data) return [];
		const { profiles } = detailQ.data;
		return [...profiles].sort((a, b) => {
			const sa = memberStats.get(a.id) ?? {
				weeklyVolume: 0,
				streakDays: 0
			};
			return (memberStats.get(b.id) ?? {
				weeklyVolume: 0,
				streakDays: 0
			}).weeklyVolume - sa.weeklyVolume;
		});
	}, [detailQ.data, memberStats]);
	const feedSorted = (0, import_react.useMemo)(() => {
		if (!detailQ.data) return [];
		return [...detailQ.data.sessions].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()).slice(0, 20).map((s) => ({
			session: s,
			logs: detailQ.data.feedLogs.filter((l) => l.session_id === s.id),
			author: detailQ.data.profiles.find((p) => p.id === s.user_id) ?? null
		}));
	}, [detailQ.data]);
	const [openFeedId, setOpenFeedId] = (0, import_react.useState)(null);
	if (detailQ.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DetailSkeleton, {});
	if (!detailQ.data) return null;
	const circle = detailQ.data.circle;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app pt-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/cerchia",
					className: "flex items-center gap-1 text-sm font-semibold text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-5 w-5" }), " Cerchie"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-3",
					children: isOwner ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: async () => {
							if (!await confirmDialog("Eliminare questa cerchia?", "L'azione è irreversibile. Tutti i membri verranno rimossi.")) return;
							try {
								await deleteCircle(circle.id);
								toast.success("Cerchia eliminata.");
								navigate({ to: "/cerchia" });
							} catch {}
						},
						disabled: isDeleting,
						className: "text-xs font-semibold text-destructive disabled:opacity-60",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "mr-1 inline h-3.5 w-3.5" }), "Elimina"]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: async () => {
							if (!await confirmDialog("Uscire da questa cerchia?", "Potrai rientrare in qualsiasi momento con il codice.")) return;
							try {
								await leaveCircle(circle.id);
								toast.success("Hai lasciato la cerchia.");
								navigate({ to: "/cerchia" });
							} catch {}
						},
						disabled: isLeaving,
						className: "text-xs font-semibold text-muted-foreground disabled:opacity-60",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "mr-1 inline h-3.5 w-3.5" }), "Esci"]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "mr-1 inline h-3 w-3" }),
						detailQ.data.profiles.length,
						" ",
						detailQ.data.profiles.length === 1 ? "membro" : "membri",
						isOwner && " · owner"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 text-3xl font-black tracking-tight",
					children: circle.name
				})]
			}),
			isOwner && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-6 rounded-2xl border border-border bg-card p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
						children: "Codice invito"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
							className: "text-2xl font-black tracking-[0.3em]",
							children: circle.code
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyCodeButton, {
							text: circle.code,
							label: "Copia codice"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted-foreground",
						children: "Condividi questo codice per invitare nuovi compagni di allenamento."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-3 text-lg font-bold",
					children: "Membri"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: sortedMembers.map((p) => {
						const s = memberStats.get(p.id) ?? {
							weeklyVolume: 0,
							streakDays: 0
						};
						const isThisUser = p.id === user.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
									name: p.display_name,
									url: p.avatar_url
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex-1 min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 truncate text-sm font-semibold",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate",
												children: p.display_name?.trim() || "Atleta"
											}),
											isThisUser && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
												children: "(tu)"
											}),
											isOwner && p.id === circle.owner_id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground",
												children: "Coach"
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-0.5 flex items-center gap-3 text-xs text-muted-foreground",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["🔥 ", s.streakDays] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "truncate",
											children: [fmtWeight(s.weeklyVolume, { digits: 0 }), " / sett."]
										})]
									})]
								}),
								s.weeklyVolume > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "h-4 w-4 shrink-0 text-muted-foreground/60" })
							]
						}, p.id);
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-3 text-lg font-bold",
					children: "Feed allenamenti"
				}), feedSorted.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "py-8 text-center text-sm text-muted-foreground",
					children: "Nessun allenamento recente in questa cerchia."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: feedSorted.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FeedItem, {
						session: item.session,
						authorName: item.author?.display_name ?? "Atleta",
						authorAvatar: item.author?.avatar_url ?? null,
						logs: item.logs,
						fmtWeight,
						isOpen: openFeedId === item.session.id,
						onToggle: () => setOpenFeedId((prev) => prev === item.session.id ? null : item.session.id)
					}, item.session.id))
				})]
			}),
			ConfirmDialog
		]
	});
}
function FeedItem({ session, authorName, authorAvatar, logs, fmtWeight, isOpen, onToggle }) {
	const open = isOpen;
	const grouped = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const l of logs) {
			const key = l.exercise_name;
			const entry = map.get(key) ?? {
				name: l.exercise_name,
				sets: []
			};
			entry.sets.push({
				setNumber: l.set_number,
				reps: l.reps,
				weight: Number(l.weight)
			});
			map.set(key, entry);
		}
		for (const e of map.values()) e.sets.sort((a, b) => a.setNumber - b.setNumber);
		return [...map.values()];
	}, [logs]);
	const when = formatDistanceToNow(new Date(session.completed_at), {
		addSuffix: true,
		locale: it
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "overflow-hidden rounded-2xl border border-border bg-card",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: onToggle,
			className: "no-tap-highlight flex w-full items-start gap-3 px-4 py-3 text-left active:scale-[0.99]",
			"aria-expanded": open,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Avatar, {
					name: authorName,
					url: authorAvatar,
					size: "sm"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "truncate text-sm font-semibold",
							children: authorName
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: when
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-0.5 truncate text-xs text-muted-foreground",
						children: [
							session.plan_name ?? "Allenamento",
							" ·",
							" ",
							fmtWeight(Number(session.total_volume), { digits: 0 }),
							" ·",
							" ",
							grouped.length,
							" ",
							grouped.length === 1 ? "esercizio" : "esercizi"
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: `h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}` })
			]
		}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-3 border-t border-border bg-background/50 px-4 py-3",
			children: [grouped.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-xs text-muted-foreground",
				children: "Nessun dettaglio disponibile."
			}) : grouped.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
				children: g.name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 space-y-1",
				children: g.sets.map((s, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-between rounded-lg bg-card px-3 py-1.5 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "font-semibold",
						children: ["Set ", i + 1]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						s.reps,
						" × ",
						fmtWeight(s.weight, { digits: 1 })
					] })]
				}, i))
			})] }, g.name)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-[10px] text-muted-foreground",
				children: format(new Date(session.completed_at), "EEEE d MMM, HH:mm", { locale: it })
			})]
		})]
	});
}
function Avatar({ name, url, size = "md" }) {
	const initials = (name ?? "?").trim().slice(0, 2).toUpperCase();
	const dim = size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
	if (url) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: url,
		alt: name ?? "Avatar",
		className: `${dim} shrink-0 rounded-full object-cover`
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `${dim} shrink-0 flex items-center justify-center rounded-full bg-muted font-bold text-muted-foreground`,
		"aria-label": name ?? "Avatar",
		children: initials
	});
}
function DetailSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app pt-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-6 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-24" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-16" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-3 w-32" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mt-2 h-9 w-48" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mt-5 h-20 w-full rounded-2xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-6 space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-20" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 rounded-2xl" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 rounded-2xl" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 rounded-2xl" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-32" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-14 rounded-2xl" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-14 rounded-2xl" })
				]
			})
		]
	});
}
//#endregion
export { CircleDetailPage as component };
