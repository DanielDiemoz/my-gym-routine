import { Link } from "@tanstack/react-router";
import { User, Settings, Download, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/i18n";

export function ProfileMenu() {
  const { t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus:outline-none">
        <User className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuItem asChild>
          <Link to="/app/profilo/account" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t("Account", "Account")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/app/profilo/impostazioni" className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            {t("Impostazioni", "Settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/profilo/download" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {t("Scarica Gymbro", "Download Gymbro")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
