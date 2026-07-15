import { Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useLanguage } from "@/lib/i18n";

/**
 * Bottone CTA per installare la PWA.
 * - Si monta solo se `canInstall === true` (altrimenti ritorna null)
 * - Click → invoca `install()` che mostra il prompt nativo del browser
 */
export function PWAInstallButton() {
  const { canInstall, install } = usePWAInstall();
  const { t } = useLanguage();

  if (!canInstall) return null;

  return (
    <button
      type="button"
      onClick={() => {
        void install();
      }}
      className="no-tap-highlight flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-all active:scale-[0.98]"
      aria-label={t("Scarica l'app", "Download app")}
    >
      <Download className="h-4 w-4" />
      {t("Scarica l'app", "Download app")}
    </button>
  );
}
