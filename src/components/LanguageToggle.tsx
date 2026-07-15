import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Toggle IT/EN riusabile. Salva la scelta in localStorage via LanguageProvider
 * e riloca automaticamente la UI (IT è il fallback).
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border bg-card p-1",
        className,
      )}
    >
      <Languages className="ml-2 h-4 w-4 text-muted-foreground" />
      <button
        type="button"
        onClick={() => setLanguage("it")}
        className={cn(
          "rounded-xl px-3 py-1.5 text-sm font-bold transition",
          language === "it"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        IT
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={cn(
          "rounded-xl px-3 py-1.5 text-sm font-bold transition",
          language === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        EN
      </button>
    </div>
  );
}
