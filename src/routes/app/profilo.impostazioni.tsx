import { createFileRoute } from "@tanstack/react-router";
import { Languages, Sun, Moon, Monitor } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/profilo/impostazioni")({
  component: ImpostazioniPage,
});

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function ImpostazioniPage() {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Language */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Languages className="h-4 w-4" />
          {t("Lingua", "Language")}
        </div>
        <LanguageToggle />
      </div>

      {/* Theme */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Sun className="h-4 w-4" />
          {t("Tema", "Theme")}
        </div>
        <div className="flex gap-2">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98]",
                theme === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
