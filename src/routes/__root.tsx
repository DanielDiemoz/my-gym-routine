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
import { LanguageProvider } from "@/lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-6xl font-bold tracking-tight">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">Pagina non trovata.</p>
        <a
          href="/"
          className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Torna alla home
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold">Qualcosa è andato storto</h1>
        <p className="mt-2 text-sm text-muted-foreground">Riprova oppure torna alla home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Riprova
          </button>
          <a
            href="/"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
          >
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
      {
        name: "description",
        content: "GymBro: crea schede, allenati e tieni traccia dei tuoi progressi settimanali.",
      },
      { property: "og:title", content: "GymBro" },
      {
        property: "og:description",
        content: "Crea schede, allenati e tieni traccia dei tuoi progressi.",
      },
      { property: "og:type", content: "website" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
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
      <head>
        <HeadContent />
      </head>
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
        // Non rubare la navigazione se siamo già nell'area di autenticazione
        // (es. durante la registrazione, signOut pulisce la sessione non
        // confermata ma il flusso deve atterrare su /auth/verify, non /auth).
        if (!router.state.location.pathname.startsWith("/auth")) {
          router.navigate({ to: "/auth" }).catch(() => {});
        }
      } else {
        queryClient.invalidateQueries();
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if (window.caches) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Outlet />
        <Toaster position="top-center" />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
