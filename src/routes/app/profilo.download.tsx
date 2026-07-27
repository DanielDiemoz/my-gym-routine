import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ChevronDown,
  CheckCircle2,
  Smartphone,
  Apple,
  Download,
  AlertTriangle,
} from "lucide-react";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/app/profilo/download")({
  component: DownloadPage,
});

function DownloadPage() {
  const { t } = useLanguage();
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const apkUrl = "/apk/gymbro.apk";

  useEffect(() => {
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && (navigator as Record<string, unknown>).standalone === true),
    );
  }, []);

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-lg font-bold">{t("Scarica GymBro", "Download GymBro")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {t("Porta il tuo allenamento sempre con te.", "Take your workout with you anywhere.")}
      </p>

      {isStandalone && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-green-500" />
          <div>
            <p className="font-semibold">
              {t("GymBro è già installata", "GymBro is already installed")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                "Stai usando la versione app. Apri dal tuo dispositivo per usarla sempre.",
                "You're using the app version. Open it from your device to use it anytime.",
              )}
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <p className="text-xs text-destructive">
          {t(
            "Non è un'app nativa, ma un collegamento diretto al sito web che funziona come un'app.",
            "Not a native app, but a direct link to the website that works like an app.",
          )}
        </p>
      </div>

      <button
        onClick={() => setShowInstructions((prev) => !prev)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all active:scale-[0.98]"
      >
        <ChevronDown
          className={`h-4 w-4 transition-transform ${showInstructions ? "rotate-180" : ""}`}
        />
        {showInstructions
          ? t("Nascondi istruzioni", "Hide instructions")
          : t("Istruzioni installazione", "Installation instructions")}
      </button>

      {showInstructions && (
        <div className="mt-3 space-y-3">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Android / Windows</h3>
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
              {t("Scarica APK (Android)", "Download APK (Android)")}
            </a>
            <details className="group mt-3">
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
                {t("Installazione manuale", "Manual install")}
              </summary>
              <ol className="mt-3 space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    1
                  </span>
                  <span>
                    {t("Apri il menu di Chrome", "Open the Chrome menu")}{" "}
                    <span className="text-muted-foreground">(⁝ tre punti)</span>{" "}
                    {t("in alto a destra", "top right")}
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    2
                  </span>
                  <span>
                    {t("Tocca", "Tap")}{" "}
                    <strong>{t("Aggiungi a Home", "Add to Home screen")}</strong>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    3
                  </span>
                  <span>
                    {t("Tocca", "Tap")} <strong>{t("Aggiungi", "Add")}</strong>{" "}
                    {t("in basso a destra", "bottom right")}
                  </span>
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
                <h3 className="font-semibold">iPhone / iPad</h3>
                <p className="text-xs text-muted-foreground">Safari</p>
              </div>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  1
                </span>
                <span>
                  {t(
                    "Apri Safari (non Chrome o altri browser)",
                    "Open Safari (not Chrome or other browsers)",
                  )}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  2
                </span>
                <span>
                  {t("Tocca il bottone", "Tap the")} <strong>{t("Condividi", "Share")}</strong>{" "}
                  <span className="text-muted-foreground">(rettangolo con freccia)</span>{" "}
                  {t("in basso", "at the bottom")}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  3
                </span>
                <span>
                  {t("Scorri e tocca", "Scroll and tap")}{" "}
                  <strong>{t("Aggiungi a Home", "Add to Home screen")}</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  4
                </span>
                <span>
                  {t("Tocca", "Tap")} <strong>{t("Aggiungi", "Add")}</strong>{" "}
                  {t("in alto a destra", "top right")}
                </span>
              </li>
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
