import { Link } from "@tanstack/react-router";
import { User, Settings, Download, SlidersHorizontal, Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/i18n";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";

interface ProfileMenuProps {
  onOpenNotifications?: () => void;
  userId?: string | null;
}

export function ProfileMenu({ onOpenNotifications, userId }: ProfileMenuProps) {
  const { t } = useLanguage();
  const { unreadCount } = useNotifications(userId);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus:outline-none">
        <User className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        {onOpenNotifications && (
          <>
            <DropdownMenuItem
              onSelect={() => {
                document.body.style.pointerEvents = "";
                onOpenNotifications();
              }}
              className="flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span>{t("Notifiche", "Notifications")}</span>
              </div>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-[10px] h-4.5 px-1.5 font-bold">
                  {unreadCount}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          asChild
          onSelect={() => {
            document.body.style.pointerEvents = "";
          }}
        >
          <Link to="/app/profilo/account" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t("Account", "Account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          onSelect={() => {
            document.body.style.pointerEvents = "";
          }}
        >
          <Link to="/app/profilo/impostazioni" className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            {t("Impostazioni", "Settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          onSelect={() => {
            document.body.style.pointerEvents = "";
          }}
        >
          <Link to="/app/profilo/download" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {t("Scarica Gymbro", "Download Gymbro")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
