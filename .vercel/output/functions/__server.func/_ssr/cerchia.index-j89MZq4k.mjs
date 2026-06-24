import { i as __toESM } from "../_runtime.mjs";
import { A as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Skeleton } from "./skeleton-D9W9wFsj.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { A as Check, b as Hash, i as Users, p as Plus, v as LogIn } from "../_libs/lucide-react.mjs";
import { n as useCircle, t as CopyCodeButton } from "./useCircle-DNavi28J.mjs";
import { t as Route } from "./cerchia.index-DS4hFXTe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cerchia.index-j89MZq4k.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Pagina "Cerchie" — TASK 4.
* - Se l'utente non è in nessuna cerchia: empty state con CTA "Entra con codice"
*   e (se coach) "Crea cerchia", entrambe aprono un bottom-sheet modale.
* - Se l'utente è già in ≥1 cerchia: lista card + FAB "+" fluttuante per entrare
*   in altre cerchie. Tap sulla card → /cerchia/$circleId.
*/
function CerchiePage() {
	const { user } = Route.useRouteContext();
	const { myCircles, isLoadingCircles, isCoach, isLoadingRole, joinCircle, isJoining, createCircle, isCreating } = useCircle(user.id);
	const [joinOpen, setJoinOpen] = (0, import_react.useState)(false);
	const [createOpen, setCreateOpen] = (0, import_react.useState)(false);
	const [lastCreated, setLastCreated] = (0, import_react.useState)(null);
	if (isLoadingCircles || isLoadingRole) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CerchieSkeleton, {});
	const hasCircles = myCircles.length > 0;
	const anySheetOpen = joinOpen || createOpen;
	function closeSheet() {
		setJoinOpen(false);
		setCreateOpen(false);
		setLastCreated(null);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app pt-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground",
					children: "Insieme"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 text-3xl font-black tracking-tight",
					children: "Cerchie"
				})]
			}),
			!hasCircles ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
				isCoach,
				onJoin: () => setJoinOpen(true),
				onCreate: () => setCreateOpen(true)
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CirclesList, {
				circles: myCircles,
				selfId: user.id,
				onJoin: () => setJoinOpen(true)
			}),
			anySheetOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CerchieModal, {
				sheet: joinOpen ? "join" : "create",
				onClose: closeSheet,
				children: [
					joinOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JoinForm, {
						loading: isJoining,
						onSubmit: async (code) => {
							try {
								await joinCircle(code);
								closeSheet();
							} catch {}
						}
					}),
					createOpen && !lastCreated && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateForm, {
						isCoach,
						loading: isCreating,
						onSubmit: async (name) => {
							try {
								setLastCreated(await createCircle(name));
							} catch {}
						}
					}),
					createOpen && lastCreated && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreatedCircleCard, {
						circle: lastCreated,
						onDone: closeSheet
					})
				]
			})
		]
	});
}
function EmptyState({ isCoach, onJoin, onCreate }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col items-center justify-center py-16 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-24 w-24 items-center justify-center rounded-full bg-muted",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, {
					className: "h-12 w-12 text-muted-foreground",
					strokeWidth: 1.5
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-base font-semibold",
				children: "Non sei ancora in nessuna cerchia"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-xs text-sm text-muted-foreground",
				children: "Entra con un codice di invito o, se sei un coach, creane una nuova."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-10 w-full max-w-xs space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: onJoin,
					className: "no-tap-highlight flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogIn, { className: "h-4 w-4" }), " Entra con un codice"]
				}), isCoach && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: onCreate,
					className: "no-tap-highlight flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-4 text-sm font-bold uppercase tracking-wide text-foreground active:scale-[0.98]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Crea cerchia"]
				})]
			})
		]
	});
}
function CirclesList({ circles, selfId, onJoin }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-2",
		children: circles.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCard, {
			circle: c,
			selfId
		}, c.id))
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		onClick: onJoin,
		"aria-label": "Entra in un'altra cerchia",
		className: "no-tap-highlight fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-95",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-6 w-6" })
	})] });
}
function CircleCard({ circle, selfId }) {
	const isOwner = circle.owner_id === selfId;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to: "/cerchia/$circleId",
		params: { circleId: circle.id },
		className: "no-tap-highlight flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 active:scale-[0.99]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-10 w-10 items-center justify-center rounded-full bg-muted",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-4 w-4" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "font-semibold",
				children: circle.name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-xs text-muted-foreground",
				children: [
					circle.member_count ?? 1,
					" ",
					circle.member_count === 1 ? "membro" : "membri"
				]
			})] })]
		}), isOwner ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CodeBadge, { code: circle.code }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
			children: "Membro"
		})]
	});
}
function CodeBadge({ code }) {
	const [copied, setCopied] = (0, import_react.useState)(false);
	function copy(e) {
		e.preventDefault();
		e.stopPropagation();
		navigator.clipboard.writeText(code).then(() => {
			setCopied(true);
			toast.success("Codice copiato!");
			setTimeout(() => setCopied(false), 1500);
		}).catch(() => toast.error("Impossibile copiare il codice"));
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick: copy,
		className: "flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-muted",
		children: [copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hash, { className: "h-3 w-3" }), code]
	});
}
function CerchieModal({ sheet, onClose, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		role: "dialog",
		"aria-modal": "true",
		"aria-label": sheet === "join" ? "Entra in cerchia" : "Crea cerchia",
		className: "fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			onClick: (e) => e.stopPropagation(),
			className: "w-full max-w-md rounded-t-3xl bg-background p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:rounded-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto mb-4 h-1.5 w-12 rounded-full bg-border sm:hidden" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-xl font-bold",
					children: sheet === "join" ? "Entra in una cerchia" : "Crea una cerchia"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5",
					children
				})
			]
		})
	});
}
function JoinForm({ loading, onSubmit }) {
	const [code, setCode] = (0, import_react.useState)("");
	function handleChange(v) {
		setCode(v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6));
	}
	async function handleSubmit() {
		if (code.length !== 6) return;
		await onSubmit(code);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Field, {
		label: "Codice invito",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			autoFocus: true,
			inputMode: "text",
			autoCapitalize: "characters",
			spellCheck: false,
			value: code,
			onChange: (e) => handleChange(e.target.value),
			onKeyDown: (e) => e.key === "Enter" && handleSubmit(),
			placeholder: "ES. GYM4K2",
			maxLength: 6,
			className: "w-full rounded-2xl border border-border bg-card px-4 py-4 text-center text-2xl font-black uppercase tracking-[0.4em] outline-none focus:border-foreground"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground",
			children: "6 caratteri · lettere e numeri"
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-5 flex gap-2",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			onClick: handleSubmit,
			disabled: loading || code.length !== 6,
			className: "no-tap-highlight flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98] disabled:opacity-60",
			children: loading ? "..." : "Entra"
		})
	})] });
}
function CreateForm({ isCoach, loading, onSubmit }) {
	const [name, setName] = (0, import_react.useState)("");
	if (!isCoach) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground",
		children: "Solo i coach possono creare una cerchia. Chiedi a un coach di invitarti con un codice, oppure contatta gli admin per essere promosso."
	});
	async function handleSubmit() {
		if (!name.trim()) return;
		await onSubmit(name);
		setName("");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
		label: "Nome cerchia",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			autoFocus: true,
			value: name,
			onChange: (e) => setName(e.target.value),
			onKeyDown: (e) => e.key === "Enter" && handleSubmit(),
			placeholder: "Es. Tribù Push A",
			className: "w-full rounded-2xl border border-border bg-card px-4 py-3 text-base outline-none focus:border-foreground"
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-5 flex gap-2",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			onClick: handleSubmit,
			disabled: loading || !name.trim(),
			className: "no-tap-highlight flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98] disabled:opacity-60",
			children: loading ? "..." : "Crea"
		})
	})] });
}
function CreatedCircleCard({ circle, onDone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground",
					children: "✓"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-base font-bold",
					children: "Cerchia creata"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: circle.name
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-border bg-card p-5 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[10px] font-semibold uppercase tracking-widest text-muted-foreground",
						children: "Codice invito"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "mt-2 block text-3xl font-black tracking-[0.3em]",
						children: circle.code
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted-foreground",
						children: "Condividi questo codice per invitare nuovi compagni."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CopyCodeButton, { text: circle.code })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: onDone,
				className: "no-tap-highlight w-full rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]",
				children: "Fatto"
			})
		]
	});
}
function Field({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground",
		children: label
	}), children] });
}
function CerchieSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "container-app pt-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "mb-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-3 w-24" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mt-3 h-8 w-32" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col items-center py-16",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-24 w-24 rounded-full" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mt-6 h-5 w-56" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mt-2 h-4 w-44" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "mt-10 h-12 w-full max-w-xs rounded-full" })
			]
		})]
	});
}
//#endregion
export { CerchiePage as component };
