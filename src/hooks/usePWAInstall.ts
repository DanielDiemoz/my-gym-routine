import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => void;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Hook per esporre l'installabilità PWA.
 * - `canInstall` = true se il browser ha emesso `beforeinstallprompt`
 * - `install()` invoca il prompt nativo e gestisce userChoice
 * Si resetta quando l'app è effettivamente installata (`appinstalled`).
 */
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(() => {
    if (typeof window === "undefined") return false;
    return deferredPrompt !== null;
  });

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const onInstalled = () => {
      deferredPrompt = null;
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
    const prompt = deferredPrompt;
    if (!prompt) return;
    try {
      prompt.prompt();
      if (prompt.userChoice) {
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") {
          deferredPrompt = null;
          setCanInstall(false);
        }
      } else {
        deferredPrompt = null;
        setCanInstall(false);
      }
    } catch (e) {
      console.error("PWA install failed", e);
    }
  }, []);

  return { canInstall, install };
}
