import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
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

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="text-xs text-destructive">
          {t(
            "Non è un'app nativa, ma un collegamento diretto al sito web che funziona come un'app.",
            "Not a native app, but a direct link to the website that works like an app.",
          )}
        </p>
      </div>

      <div className="mt-3 space-y-3">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">Android</h3>
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
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">
                {t(
                  "Durante l'installazione, Android potrebbe mostrare un avviso '",
                  "During installation, Android may show a warning '",
                )}
                <strong>{t("file dannoso", "file may be harmful")}</strong>
                {t("' o '", "' or '")}
                <strong>{t("produttore non verificato", "unverified publisher")}</strong>
                {t(
                  "'. Non preoccuparti, è normale per app non pubblicate sul Play Store. GymBro è sicura.",
                  "'. Don't worry, this is normal for apps not published on the Play Store. GymBro is safe.",
                )}
              </p>
            </div>
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
                  {t("Apri Safari", "Open Safari")}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  2
                </span>
                <span>
                  {t("Tocca il bottone", "Tap the")} <strong>{t("Condividi", "Share")}</strong>{" "}
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
                  {t(
                    " (a volte devi scorrere molto in basso)",
                    " (sometimes you need to scroll way down)",
                  )}
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
    </div>
  );
}
