import { useState } from "react";
import { format } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  Inbox,
  Mail,
  Megaphone,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { useLanguage } from "@/lib/i18n";
import { toast } from "sonner";

interface NotificationsSheetProps {
  userId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  className?: string;
}

export function NotificationsSheet({
  userId,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  showTrigger = true,
  className,
}: NotificationsSheetProps) {
  const { t, dateLocale } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "direct" | "system">("all");

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const {
    notifications,
    unreadCount,
    unreadDirectCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingRead,
  } = useNotifications(userId);

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "direct") return n.is_direct;
    if (activeTab === "system") return !n.is_direct;
    return true;
  });

  const handleMarkAsRead = async (n: AppNotification) => {
    try {
      await markAsRead(n.id, n.is_direct);
    } catch {
      toast.error(t("Errore durante l'aggiornamento", "Error updating notification"));
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      toast.success(t("Tutte le notifiche segnate come lette", "All notifications marked as read"));
    } catch {
      toast.error(t("Errore durante l'aggiornamento", "Error updating notifications"));
    }
  };

  const handleDelete = async (n: AppNotification) => {
    try {
      await deleteNotification(n.id, n.is_direct);
      toast.success(t("Notifica rimossa", "Notification removed"));
    } catch {
      toast.error(t("Errore nella rimozione", "Error deleting notification"));
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {showTrigger && (
        <SheetTrigger asChild>
          <button
            type="button"
            className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:text-foreground hover:border-primary/40 focus:outline-none ${className ?? ""}`}
            aria-label={t("Notifiche", "Notifications")}
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-sm animate-in zoom-in-50">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </SheetTrigger>
      )}

      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md bg-background border-l border-border"
      >
        <SheetHeader className="p-4 border-b border-border/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base font-bold">
                {t("Centro Notifiche", "Notification Center")}
              </SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs px-2 py-0.5">
                  {unreadCount} {t("nuove", "new")}
                </Badge>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAll}
                disabled={isMarkingRead}
                className="h-8 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{t("Segna tutte", "Mark all")}</span>
              </Button>
            )}
          </div>

          <div className="pt-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="all" className="text-xs">
                  {t("Tutte", "All")} ({notifications.length})
                </TabsTrigger>
                <TabsTrigger value="direct" className="text-xs relative">
                  {t("Diretti", "Direct")}
                  {unreadDirectCount > 0 && (
                    <span className="ml-1 flex h-2 w-2 rounded-full bg-primary" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="system" className="text-xs">
                  {t("Sistema", "System")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-3">
                <Inbox className="h-6 w-6 opacity-60" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t("Nessun messaggio", "No messages")}
              </p>
              <p className="mt-1 text-xs max-w-xs text-muted-foreground">
                {activeTab === "direct"
                  ? t(
                      "Non hai ricevuto messaggi diretti personali dall'admin.",
                      "You have not received any direct personal messages from the admin.",
                    )
                  : activeTab === "system"
                    ? t(
                        "Nessuna notifica di sistema al momento.",
                        "No system notifications at the moment.",
                      )
                    : t(
                        "Non ci sono notifiche al momento. I messaggi dell'admin e le novità appariranno qui.",
                        "No notifications right now. Admin messages and updates will appear here.",
                      )}
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {filteredNotifications.map((notif) => {
                const isUnread = !notif.is_read;
                const formattedDate = format(new Date(notif.created_at), "d MMM, HH:mm", {
                  locale: dateLocale,
                });

                return (
                  <div
                    key={notif.id}
                    className={`relative rounded-xl border p-4 transition-all ${
                      notif.is_direct
                        ? isUnread
                          ? "border-primary/40 bg-primary/5 dark:bg-primary/10 shadow-sm"
                          : "border-border bg-card/60"
                        : isUnread
                          ? "border-border/80 bg-accent/40"
                          : "border-border bg-card/40 opacity-80"
                    }`}
                  >
                    {/* Header badge & time */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {notif.is_direct ? (
                          <Badge
                            variant="default"
                            className="text-[10px] h-5 px-1.5 gap-1 font-medium bg-primary/90 text-primary-foreground"
                          >
                            <Mail className="h-3 w-3" />
                            {t("Messaggio Diretto", "Direct Message")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-1.5 gap-1 font-medium"
                          >
                            <Megaphone className="h-3 w-3" />
                            {t("Sistema", "System")}
                          </Badge>
                        )}

                        {isUnread && (
                          <span className="flex h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>

                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {formattedDate}
                      </span>
                    </div>

                    {/* Sender & Title */}
                    <div className="space-y-1 mb-2">
                      {notif.is_direct && notif.sender_name && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                          <ShieldAlert className="h-3 w-3 text-primary" />
                          <span>{t("Da:", "From:")} {notif.sender_name}</span>
                        </div>
                      )}
                      <h4 className="text-sm font-bold text-foreground tracking-tight leading-snug">
                        {notif.title}
                      </h4>
                    </div>

                    {/* Message Body */}
                    <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line break-words bg-background/50 rounded-lg p-2.5 border border-border/40">
                      {notif.message}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-3 flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                      {isUnread && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notif)}
                          className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          <span>{t("Segna come letta", "Mark read")}</span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(notif)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title={t("Elimina notifica", "Delete notification")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
