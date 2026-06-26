import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ChevronLeft, Smartphone, Apple, CheckCircle2, Download } from "lucide-react";
import { PWAInstallButton } from "@/components/PWAInstallButton";

export const Route = createFileRoute("/_authenticated/scarica")({
  component: DownloadPage,
});

function DownloadPage() {
  const [isStandalone, setIsStandalone] = useState(false);
  const apkUrl = "/apk/gymbro.apk";

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && (navigator as Record<string, unknown>).standalone === true),
    );
  }, []);

  return (
    <div className="container-app pt-6">
      <header className="mb-6">
        <Link
          to="/"
          className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-5 w-5" /> Dashboard
        </Link>
      </header>

      {isStandalone && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
          <div>
            <p className="font-semibold">GymBro è già installata</p>
            <p className="text-xs text-muted-foreground">
              Stai usando la versione app. Apri dal tuo dispositivo per usarla sempre.
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight">Scarica GymBro</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Porta il tuo allenamento sempre con te.
        </p>
      </div>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Android / Windows</h2>
            <p className="text-xs text-muted-foreground">Chrome, Edge, Samsung Internet</p>
          </div>
        </div>
        <PWAInstallButton />
        <a
          href={apkUrl}
          download
          className="mt-3 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all active:scale-[0.98]"
        >
          <Download className="h-4 w-4" />
          Scarica APK (Android)
        </a>
        <details className="group mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Installazione manuale
          </summary>
          <ol className="mt-3 space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">1</span>
              <span>Apri il menu di Chrome <span className="text-muted-foreground">(⁝ tre punti)</span> in alto a destra</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">2</span>
              <span>Tocca <strong>Aggiungi a Home</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">3</span>
              <span>Tocca <strong>Aggiungi</strong> in basso a destra</span>
            </li>
          </ol>
        </details>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Apple className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">iPhone / iPad</h2>
            <p className="text-xs text-muted-foreground">Safari</p>
          </div>
        </div>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
              1
            </span>
            <span>Apri Safari (non Chrome o altri browser)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
              2
            </span>
            <span>Tocca il bottone <strong>Condividi</strong> <span className="text-muted-foreground">(rettangolo con freccia)</span> in basso</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
              3
            </span>
            <span>Scorri e tocca <strong>Aggiungi a Home</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
              4
            </span>
            <span>Tocca <strong>Aggiungi</strong> in alto a destra</span>
          </li>
        </ol>
      </section>
    </div>
  );
}
