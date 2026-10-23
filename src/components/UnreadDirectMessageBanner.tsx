import { Mail, ArrowRight } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface UnreadDirectMessageBannerProps {
  userId?: string | null;
  onOpenNotifications: () => void;
}

export function UnreadDirectMessageBanner({
  userId,
  onOpenNotifications,
}: UnreadDirectMessageBannerProps) {
  const { latestUnreadDirect, unreadDirectCount } = useNotifications(userId);
  const { t } = useLanguage();

  if (!latestUnreadDirect || unreadDirectCount === 0) {
    return null;
  }

  return (
    <div
      onClick={onOpenNotifications}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenNotifications();
        }
      }}
      className="group mb-5 flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 transition-all hover:bg-primary/15 hover:border-primary/60 cursor-pointer shadow-sm"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Mail className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              {unreadDirectCount > 1
                ? `${unreadDirectCount} ${t("Messaggi Diretti", "Direct Messages")}`
                : t("Messaggio Diretto dall'Admin", "Direct Message from Admin")}
            </span>
          </div>
          <p className="truncate text-sm font-semibold text-foreground">
            {latestUnreadDirect.title}
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 h-8 text-xs font-medium gap-1 text-primary group-hover:translate-x-0.5 transition-transform"
      >
        <span>{t("Leggi", "Read")}</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
