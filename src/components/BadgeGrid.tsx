import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { type Achievement } from "@/hooks/useAchievements";
import { useLanguage } from "@/lib/i18n";

export function BadgeGrid({ achievements }: { achievements: Achievement[] }) {
  const { t, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);
  const displayed = expanded ? achievements : unlocked;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">{t("Traguardi", "Achievements")}</h3>
          <p className="text-xs text-muted-foreground">
            {unlocked.length}/{achievements.length} {t("sbloccati", "unlocked")}
          </p>
        </div>
        {locked.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
          >
            {expanded ? t("Meno", "Less") : t("Tutti", "All")}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {displayed.map((a) => (
          <div key={a.id} className="flex flex-col items-center text-center">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${
                a.unlocked ? "bg-primary/10" : "bg-muted opacity-40 grayscale"
              }`}
            >
              {a.unlocked ? a.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
            </div>
            <p className="mt-1.5 text-[10px] font-semibold leading-tight text-foreground">
              {a.name[language]}
            </p>
            {!a.unlocked && a.target > 1 && (
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                {Math.round((a.progress / a.target) * 100)}%
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
