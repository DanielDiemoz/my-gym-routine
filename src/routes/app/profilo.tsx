import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/app/profilo")({
  ssr: false,
  beforeLoad: ({ location }) => {
    if (location.pathname === "/app/profilo") {
      throw redirect({ to: "/app/profilo/account" });
    }
  },
  component: ProfiloLayout,
});

function ProfiloLayout() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="container-app pt-6">
        <header className="mb-6">
          <Link
            to="/app"
            className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
          >
            <ChevronLeft className="h-5 w-5" /> {t("Dashboard", "Dashboard")}
          </Link>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
