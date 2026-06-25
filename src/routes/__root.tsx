import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-6xl font-bold tracking-tight">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">Pagina non trovata.</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Torna alla home
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("errorComponent caught:", error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  let errorText = String(error);
  try {
    if (error instanceof Error) {
      errorText = `${error.name}: ${error.message}`;
    } else if (typeof error === 'object' && error !== null) {
      errorText = JSON.stringify(error, (k, v) => (typeof v === 'function' ? undefined : v), 2);
    }
  } catch {}

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm w-full text-center">
        <h1 className="text-xl font-semibold">Qualcosa è andato storto</h1>
        <div className="mt-3 rounded-lg bg-destructive/10 p-3 text-left text-xs leading-relaxed text-destructive overflow-auto max-h-40">
          <code>{errorText}</code>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Riprova oppure torna alla home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Riprova
          </button>
          <a href="/" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0a0a0a" },
      { title: "GymBro — Allenamento essenziale" },
      { name: "description", content: "GymBro: crea schede, allenati e tieni traccia dei tuoi progressi settimanali." },
      { property: "og:title", content: "GymBro" },
      { property: "og:description", content: "Crea schede, allenati e tieni traccia dei tuoi progressi." },
      { property: "og:type", content: "website" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      console.error("UNHANDLED REJECTION:", e.reason);
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  useEffect(() => {
    let initial = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      // Supabase fires SIGNED_IN synchronously during subscribe() when a
      // session already exists. We must skip it because the router is still
      // resolving the initial route — calling router.invalidate() during that
      // phase causes race conditions that surface as "Qualcosa è andato storto".
      if (initial) {
        initial = false;
        return;
      }
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      // Usa navigate invece di router.invalidate() per evitare race condition
      // con navigazioni in corso (es. dopo onboarding)
      if (event === "SIGNED_OUT") {
        router.navigate({ to: "/auth" }).catch(() => {});
      } else {
        queryClient.invalidateQueries();
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
