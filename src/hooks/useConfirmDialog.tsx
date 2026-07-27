import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/lib/i18n";

interface DialogContent {
  title: string;
  description?: string;
}

/**
 * Hook riusabile per conferme modali accessibili in stile shadcn.
 * - `confirm(title, description?)` → Promise<boolean>
 * - `<ConfirmDialog />` va renderizzato inline nel JSX del consumer
 * - Se il componente si smonta mentre la dialog è aperta, risolve la pending Promise come `false`
 * - Se viene chiamato `confirm()` mentre un'altra dialog è aperta, chiude la precedente come annullata
 */
export function useConfirmDialog() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<DialogContent | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  // Cleanup: se l'utente naviga via mentre la dialog è aperta, risolviamo come annullata.
  useEffect(() => {
    return () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  const confirm = useCallback((title: string, description?: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      // Se c'è già una pending, risolviamola come annullata prima di aprirne una nuova.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setContent({ title, description });
      setOpen(true);
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    setOpen(false);
    // Resolver può già essere null se cleanup ha girato prima; controlliamo.
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.(value);
  }, []);

  const ConfirmDialog = (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) finish(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{content?.title ?? ""}</AlertDialogTitle>
          {content?.description && (
            <AlertDialogDescription>{content.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => finish(false)}>
            {t("Annulla", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => finish(true)}>
            {t("Conferma", "Confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}
