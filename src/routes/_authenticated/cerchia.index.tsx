import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Users, Globe, Copy, Plus, Hash, LogIn, Check } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { useCircle, type Circle } from "@/hooks/useCircle";

export const Route = createFileRoute("/_authenticated/cerchia/")({
  component: CerchiePage,
});

// ── Costanti della cerchia di default ─────────────────────────────────────────
// Popolate dalla migration supabase/migrations/20260624_default_community.sql.
// Vengono qui come costanti (e non da una query) perché sono record statici
// di sistema: non cambiano nel tempo e l'utente non può modificarli.
const DEFAULT_COMMUNITY_ID = "00000000-0000-0000-0000-000000000002";
const DEFAULT_COMMUNITY_CODE = "GYMBRO";

/**
 * Pagina "Cerchie" — TASK 4.
 * - Se l'utente non è in nessuna cerchia: empty state con CTA "Entra con codice"
 *   e (se coach) "Crea cerchia", entrambe aprono un bottom-sheet modale.
 * - Se l'utente è già in ≥1 cerchia: lista card + FAB "+" fluttuante per entrare
 *   in altre cerchie. Tap sulla card → /cerchia/$circleId.
 */
function CerchiePage() {
  const { user } = Route.useRouteContext();
  const {
    myCircles,
    isLoadingCircles,
    isCoach,
    isLoadingRole,
    joinCircle,
    isJoining,
    createCircle,
    isCreating,
  } = useCircle(user.id);

  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  // TASK 4 — Dopo creazione il bottom-sheet mostra una card con il codice
  // generato. Lo stato serve a renderizzare il success card invece del form.
  const [lastCreated, setLastCreated] = useState<Circle | null>(null);

  const loading = isLoadingCircles || isLoadingRole;

  if (loading) {
    return <CerchieSkeleton />;
  }

  const hasCircles = myCircles.length > 0;
  // La community di default è pinnata in cima alla pagina (sempre visibile),
  // quindi va esclusa dalla CirclesList per evitare la duplicazione visiva.
  // Le "altre cerchie" sono tutte le altre (personali, create dall'utente,
  // oppure joinate via codice).
  const visibleCircles = myCircles.filter(
    (c) => c.id !== DEFAULT_COMMUNITY_ID,
  );
  const isInCommunity = myCircles.some(
    (c) => c.id === DEFAULT_COMMUNITY_ID,
  );
  const anySheetOpen = joinOpen || createOpen;

  function closeSheet() {
    setJoinOpen(false);
    setCreateOpen(false);
    setLastCreated(null);
  }

  return (
    <div className="container-app pt-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Insieme
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Cerchie</h1>
      </header>

      {/* Community di default: sempre pinnata in cima, prima di tutto il resto. */}
      <CommunityCard
        isMember={isInCommunity}
        isJoining={isJoining}
        onJoin={() => joinCircle(DEFAULT_COMMUNITY_CODE)}
      />

      {!hasCircles ? (
        <EmptyState
          isCoach={isCoach}
          onJoin={() => setJoinOpen(true)}
          onCreate={() => setCreateOpen(true)}
        />
      ) : (
        <CirclesList
          circles={visibleCircles}
          selfId={user.id}
          onJoin={() => setJoinOpen(true)}
        />
      )}

      {anySheetOpen && (
        <CerchieModal
          sheet={joinOpen ? "join" : "create"}
          onClose={closeSheet}
        >
          {joinOpen && (
            <JoinForm
              loading={isJoining}
              onSubmit={async (code) => {
                try {
                  await joinCircle(code);
                  closeSheet();
                } catch {
                  /* toast gestito dall'hook */
                }
              }}
            />
          )}
          {createOpen && !lastCreated && (
            <CreateForm
              isCoach={isCoach}
              loading={isCreating}
              onSubmit={async (name) => {
                try {
                  const created = await createCircle(name);
                  setLastCreated(created);
                } catch {
                  /* toast gestito dall'hook */
                }
              }}
            />
          )}
          {createOpen && lastCreated && (
            <CreatedCircleCard
              circle={lastCreated}
              onDone={closeSheet}
            />
          )}
        </CerchieModal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cerchia di default ("GymBro Community")
// Card pinned in cima alla pagina, sempre visibile a tutti gli utenti.
// - Se NON sei membro: bottone "Entra subito →" che usa joinCircle('GYMBRO')
//   (riusa la mutation esistente — la cerchia ha code='GYMBRO' in DB).
// - Se SEI già membro: bottone "Vai alla community →" che naviga al dettaglio.
// Stesso layout delle altre cerchie (avatar + nome + subtitle), con un chip
// "⭐ Ufficiale" inline al titolo.
// ─────────────────────────────────────────────────────────────────────────────
function CommunityCard({
  isMember,
  isJoining,
  onJoin,
}: {
  isMember: boolean;
  isJoining: boolean;
  onJoin: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <Globe className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">GymBro Community</span>
            <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
              ⭐ Ufficiale
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            La community ufficiale di GymBro
          </div>
        </div>
      </div>
      {isMember ? (
        <Link
          to="/cerchia/$circleId"
          params={{ circleId: DEFAULT_COMMUNITY_ID }}
          className="no-tap-highlight shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground active:scale-[0.98]"
        >
          Vai alla community →
        </Link>
      ) : (
        <button
          onClick={onJoin}
          disabled={isJoining}
          className="no-tap-highlight shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground active:scale-[0.98] disabled:opacity-60"
        >
          {isJoining ? "..." : "Entra subito →"}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state (TASK 4: nessuna cerchia)
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({
  isCoach,
  onJoin,
  onCreate,
}: {
  isCoach: boolean;
  onJoin: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <Users className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="mt-6 text-base font-semibold">Non sei ancora in nessuna cerchia</p>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Entra con un codice di invito o, se sei un coach, creane una nuova.
      </p>

      <div className="mt-10 w-full max-w-xs space-y-3">
        <button
          onClick={onJoin}
          className="no-tap-highlight flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]"
        >
          <LogIn className="h-4 w-4" /> Entra con un codice
        </button>
        {isCoach && (
          <button
            onClick={onCreate}
            className="no-tap-highlight flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-4 text-sm font-bold uppercase tracking-wide text-foreground active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Crea cerchia
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lista cerchie
// ─────────────────────────────────────────────────────────────────────────────
function CirclesList({
  circles,
  selfId,
  onJoin,
}: {
  circles: Circle[];
  selfId: string;
  onJoin: () => void;
}) {
  return (
    <>
      <div className="space-y-2">
        {circles.map((c) => (
          <CircleCard key={c.id} circle={c} selfId={selfId} />
        ))}
      </div>

      {/* FAB — TASK 4: bottone '+' fisso in basso per entrare in altre cerchie. */}
      <button
        onClick={onJoin}
        aria-label="Entra in un'altra cerchia"
        className="no-tap-highlight fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>
    </>
  );
}

function CircleCard({ circle, selfId }: { circle: Circle; selfId: string }) {
  const isOwner = circle.owner_id === selfId;
  return (
    <Link
      to="/cerchia/$circleId"
      params={{ circleId: circle.id }}
      className="no-tap-highlight flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <div className="font-semibold">{circle.name}</div>
          <div className="text-xs text-muted-foreground">
            {circle.member_count ?? 1}{" "}
            {circle.member_count === 1 ? "membro" : "membri"}
          </div>
        </div>
      </div>
      {isOwner ? (
        <CodeBadge code={circle.code} />
      ) : (
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Membro
        </span>
      )}
    </Link>
  );
}

function CodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    // Evita la navigazione del <Link> genitore.
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        toast.success("Codice copiato!");
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("Impossibile copiare il codice"));
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-muted"
    >
      {copied ? <Check className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
      {code}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom-sheet modal (no-restore): riusato sia per join che per create.
// ─────────────────────────────────────────────────────────────────────────────
function CerchieModal({
  sheet,
  onClose,
  children,
}: {
  sheet: "join" | "create";
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={sheet === "join" ? "Entra in cerchia" : "Crea cerchia"}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-background p-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border sm:hidden" />
        <h3 className="text-xl font-bold">
          {sheet === "join" ? "Entra in una cerchia" : "Crea una cerchia"}
        </h3>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function JoinForm({
  loading,
  onSubmit,
}: {
  loading: boolean;
  onSubmit: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  // Forza uppercase + max 6 caratteri. Lo facciamo nel componente invece di
  // affidarsi solo a maxLength così evitiamo caratteri speciali / spazi.
  function handleChange(v: string) {
    const cleaned = v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    setCode(cleaned);
  }
  async function handleSubmit() {
    if (code.length !== 6) return;
    await onSubmit(code);
  }
  return (
    <>
      <Field label="Codice invito">
        <input
          autoFocus
          inputMode="text"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="ES. GYM4K2"
          maxLength={6}
          className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-center text-2xl font-black uppercase tracking-[0.4em] outline-none focus:border-foreground"
        />
        <p className="mt-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          6 caratteri · lettere e numeri
        </p>
      </Field>

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading || code.length !== 6}
          className="no-tap-highlight flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "..." : "Entra"}
        </button>
      </div>
    </>
  );
}

function CreateForm({
  isCoach,
  loading,
  onSubmit,
}: {
  isCoach: boolean;
  loading: boolean;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  if (!isCoach) {
    return (
      <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Solo i coach possono creare una cerchia. Chiedi a un coach di invitarti
        con un codice, oppure contatta gli admin per essere promosso.
      </p>
    );
  }
  async function handleSubmit() {
    if (!name.trim()) return;
    await onSubmit(name);
    setName("");
  }
  return (
    <>
      <Field label="Nome cerchia">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Es. Tribù Push A"
          className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-base outline-none focus:border-foreground"
        />
      </Field>

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="no-tap-highlight flex-1 rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "..." : "Crea"}
        </button>
      </div>
    </>
  );
}

function CreatedCircleCard({
  circle,
  onDone,
}: {
  circle: Circle;
  onDone: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          ✓
        </div>
        <div>
          <p className="text-base font-bold">Cerchia creata</p>
          <p className="text-xs text-muted-foreground">
            {circle.name}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Codice invito
        </p>
        <code className="mt-2 block text-3xl font-black tracking-[0.3em]">
          {circle.code}
        </code>
        <p className="mt-2 text-xs text-muted-foreground">
          Condividi questo codice per invitare nuovi compagni.
        </p>
        <div className="mt-4 flex justify-center">
          <CopyCodeButton text={circle.code} />
        </div>
      </div>

      <button
        onClick={onDone}
        className="no-tap-highlight w-full rounded-full bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98]"
      >
        Fatto
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loading state
// ─────────────────────────────────────────────────────────────────────────────
function CerchieSkeleton() {
  return (
    <div className="container-app pt-10">
      <header className="mb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-32" />
      </header>
      <div className="flex flex-col items-center py-16">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="mt-6 h-5 w-56" />
        <Skeleton className="mt-2 h-4 w-44" />
        <Skeleton className="mt-10 h-12 w-full max-w-xs rounded-full" />
      </div>
    </div>
  );
}
