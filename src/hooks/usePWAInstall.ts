import { useCallback, useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/**
 * Hook per esporre l'installabilità PWA.
 * - `canInstall` = true se il browser ha emesso `beforeinstallprompt`
 * - `install()` invoca il prompt nativo e gestisce userChoice
 * Si resetta quando l'app è effettivamente installata (`appinstalled`).
 */
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Evita il mini-infobar automatico di Chrome
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const onInstalled = () => {
      deferredPrompt.current = null;
      setCanInstall(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<void> => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      deferredPrompt.current = null;
      setCanInstall(false);
    }
    // Se l'utente dismissa, lasciamo il bottone disponibile per riprovare.
  }, []);

  return { canInstall, install };
}
