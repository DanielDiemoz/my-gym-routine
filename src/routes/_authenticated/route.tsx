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

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { data: dbProfile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarded, display_name")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
    }

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
    !loc.pathname.startsWith("/onboarding");

  useEffect(() => {
    if (isFromOnboarding) resetOnboardingFlag();
  }, [isFromOnboarding]);

  useEffect(() => {
    if (needsOnboarding) navigate({ to: "/onboarding" });
  }, [needsOnboarding, navigate]);

  // Gli account legacy (solo username, email @gymbro.local) non possono usare
  // l'app finché non collegano un'email reale per il recupero password.
  if (isLegacyEmail(user.email)) {
    return <EmailMigrationGate user={user} />;
  }

  if (needsOnboarding) {
    return null;
  }

  const showNav = !loc.pathname.startsWith("/onboarding");

  return (
    <div className="min-h-screen bg-background pb-24">
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
  const items = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/schede", icon: Dumbbell, label: "Schede" },
    { to: "/storico", icon: HistoryIcon, label: "Storico" },
    { to: "/cerchia", icon: Users, label: "Cerchia" },
    { to: "/profilo", icon: User, label: "Profilo" },
  ] as const;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-app flex h-16 items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {items.map((it) => {
          const active = it.to === "/" ? pathname === "/" : pathname.startsWith(it.to);
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
