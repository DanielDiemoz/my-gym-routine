import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Home, Dumbbell, History as HistoryIcon, Users, Play } from "lucide-react";
import { WeightUnitProvider } from "@/hooks/useWeightUnit";
import { checkOnboardingFlag, resetOnboardingFlag } from "@/lib/onboarding-flag";
import { WorkoutProvider } from "@/lib/workout-context";
import { EmailMigrationGate } from "@/components/EmailMigrationGate";
import { isLegacyEmail } from "@/lib/legacy-email";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: dbProfile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarded, display_name, role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

    if (dbProfile?.role === "admin") throw redirect({ to: "/admin" });

    return { user: data.user, profile: dbProfile ?? null };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { profile, user } = Route.useRouteContext();
  const loc = useLocation();
  const navigate = useNavigate();

  // La logica onboarding è qui (client-side, dentro ssr:false)
  // perché primaLoad gira anche in SSR.
  // checkOnboardingFlag legge window.__gymbro_onboarded SENZA
  // cancellarlo, così le doppie chiamate di Strict Mode vedono lo stesso valore.
  const isFromOnboarding = checkOnboardingFlag();
  const effectiveProfile = isFromOnboarding && profile ? { ...profile, onboarded: true } : profile;
  const needsOnboarding =
    effectiveProfile !== null &&
    !effectiveProfile.onboarded &&
    !loc.pathname.startsWith("/app/onboarding");

  useEffect(() => {
    if (isFromOnboarding) resetOnboardingFlag();
  }, [isFromOnboarding]);

  useEffect(() => {
    if (needsOnboarding) navigate({ to: "/app/onboarding" });
  }, [needsOnboarding, navigate]);

  // Gli account legacy (solo username, email @gymbro.local) non possono usare
  // l'app finché non collegano un'email reale per il recupero password.
  if (isLegacyEmail(user.email)) {
    return <EmailMigrationGate user={user} />;
  }

  if (needsOnboarding) {
    return null;
  }

  const isWorkoutFocus = loc.pathname.startsWith("/app/allena/");
  const showNav =
    !loc.pathname.startsWith("/app/onboarding") &&
    !loc.pathname.startsWith("/app/profilo") &&
    !isWorkoutFocus;

  return (
    <div className={`min-h-screen bg-background ${showNav ? "pb-32" : ""}`}>
      <WorkoutProvider>
        <WeightUnitProvider>
          <Outlet />
          {showNav && <ActiveWorkoutMiniPlayer userId={user.id} />}
        </WeightUnitProvider>
      </WorkoutProvider>
      {showNav && <BottomNav pathname={loc.pathname} />}
    </div>
  );
}

function ActiveWorkoutMiniPlayer({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const activeQ = useQuery({
    queryKey: ["active-session", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, plan_id, plan_name, started_at")
        .eq("user_id", userId)
        .is("completed_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 10_000,
  });

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeQ.data?.started_at) return;
    const startMs = new Date(activeQ.data.started_at).getTime();
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [activeQ.data?.started_at]);

  if (!activeQ.data?.plan_id) return null;

  const mins = Math.floor(elapsed / 60);
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="fixed inset-x-0 z-40 mx-auto max-w-md px-3 bottom-[calc(5.1rem+env(safe-area-inset-bottom))]">
      <Link
        to="/app/allena/$planId"
        params={{ planId: activeQ.data.plan_id }}
        className="no-tap-highlight glass-panel flex items-center justify-between gap-3 rounded-2xl border-primary/35 px-4 py-3 transition active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Dumbbell className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-xs font-extrabold text-foreground">
                {activeQ.data.plan_name ?? t("Allenamento", "Workout")}
              </span>
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary tabular-nums">
                {mins}:{secs}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {t("Sessione live in corso · Tocca per riprendere", "Live session · Tap to resume")}
            </div>
          </div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
        </div>
      </Link>
    </div>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  const { t } = useLanguage();
  const items = [
    { to: "/app", icon: Home, label: t("Home", "Home") },
    { to: "/app/schede", icon: Dumbbell, label: t("Schede", "Plans") },
    { to: "/app/storico", icon: HistoryIcon, label: t("Storico", "History") },
    { to: "/app/cerchia", icon: Users, label: t("Cerchia", "Circle") },
  ] as const;
  return (
    <nav
      aria-label={t("Navigazione principale", "Main navigation")}
      className="glass-panel fixed inset-x-0 z-40 mx-auto max-w-md mx-3 sm:mx-auto bottom-[calc(0.75rem+env(safe-area-inset-bottom))] rounded-2xl"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {items.map((it) => {
          const active = it.to === "/app" ? pathname === "/app" : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`no-tap-highlight relative flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                active
                  ? "bg-primary/14 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 transition-transform ${active ? "stroke-[2.5] scale-105" : ""}`} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
