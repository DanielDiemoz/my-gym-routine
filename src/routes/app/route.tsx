import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Home, Dumbbell, History as HistoryIcon, Users, User } from "lucide-react";
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

  const showNav = !loc.pathname.startsWith("/app/onboarding") && !loc.pathname.startsWith("/app/profilo");

  return (
    <div className="min-h-screen bg-background pb-28">
      <WorkoutProvider>
        <WeightUnitProvider>
          <Outlet />
        </WeightUnitProvider>
      </WorkoutProvider>
      {showNav && <BottomNav pathname={loc.pathname} />}
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
    <nav className="fixed inset-x-0 mx-3 z-40 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] rounded-2xl border border-white/5 bg-white/15 dark:bg-white/1 backdrop-blur-xl shadow-md">
      <div className="flex h-16 items-center justify-around px-4">
        {items.map((it) => {
          const active = it.to === "/app" ? pathname === "/app" : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`no-tap-highlight flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
