import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, Dumbbell, History as HistoryIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Check onboarding
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", data.user.id)
      .maybeSingle();
    return { user: data.user, profile };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { profile } = Route.useRouteContext();
  const loc = useLocation();
  const needsOnboarding = (!profile || !profile.onboarded) && !loc.pathname.startsWith("/onboarding");

  if (needsOnboarding) {
    // Soft redirect via Link replacement: simplest is to just render onboarding.
    // Use TanStack redirect via window for safety in client-only layout.
    if (typeof window !== "undefined") window.location.replace("/onboarding");
    return null;
  }

  const showNav = !loc.pathname.startsWith("/onboarding") && !loc.pathname.startsWith("/allena/");

  return (
    <div className="min-h-screen bg-background pb-24">
      <Outlet />
      {showNav && <BottomNav pathname={loc.pathname} />}
    </div>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  const items = [
    { to: "/", icon: Home, label: "Oggi" },
    { to: "/schede", icon: Dumbbell, label: "Schede" },
    { to: "/storico", icon: HistoryIcon, label: "Storico" },
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
