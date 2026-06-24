import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Bottone "Copia codice" usato sia nella card della cerchia appena creata
 * sia nel pannello codice invito nella pagina di dettaglio.
 *
 * La logica di copia è centralizzata qui perché 3 implementazioni separate
 * (CodeBadge, vecchio CopyButton inline, CopyButtonInline) divergevano e
 * diventavano un bug-magnet. Questo componente è il single source of truth.
 */
export function CopyCodeButton({
  text,
  label = "Copia codice",
  size = "md",
  className,
  onCopy,
}: {
  text: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  /** Callback opzionale dopo la copia riuscita (es. analytics, focus shift). */
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const iconDim = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const padding = size === "sm" ? "px-3 py-1.5 text-[10px]" : "px-4 py-2 text-xs";

  return (
    <button
      onClick={() => {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            setCopied(true);
            toast.success("Codice copiato!");
            onCopy?.();
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => toast.error("Copia non riuscita"));
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-full border border-border bg-background font-bold uppercase tracking-widest hover:bg-muted",
        padding,
        className,
      )}
    >
      {copied ? <Check className={iconDim} /> : <Copy className={iconDim} />}
      {copied ? "Copiato" : label}
    </button>
  );
}
