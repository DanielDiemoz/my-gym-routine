import { useCallback, useEffect, useRef, useState } from "react";
import { Timer, Volume2, VolumeX } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const SOUND_STORAGE_KEY = "gymbro_sound_enabled";

function readSoundPref(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(SOUND_STORAGE_KEY);
  return v === null ? true : v === "true";
}

/**
 * Rest timer con:
 * - Vibrazione al termine (`navigator.vibrate`) se supportata
 * - Audio finale (`/sounds/beep.mp3`) — toggle persistito in localStorage
 * - Notification API al termine SOLO se l'app è in background e il permesso è concesso
 */
export function RestTimer() {
  const { t } = useLanguage();
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState(90);
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);

  const remaining = Math.max(0, target - seconds);
  const mm = String(Math.floor(remaining / 60));
  const ss = String(remaining % 60).padStart(2, "0");

  // Persisti la preferenza audio (in Safari private mode / quota exceeded
  // setItem può lanciare: catturiamo per non rompere l'effect chain).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, soundOn ? "true" : "false");
    } catch {
      // Modalità privata / quota piena: ignoriamo silenziosamente.
    }
  }, [soundOn]);

  // Registra il service worker per le notifiche (usa sempre lo stesso "sw.js").
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // Richiede il permesso notifiche e mostra la notifica all'avvio del timer.
  useEffect(() => {
    if (!running || typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    if (Notification.permission !== "granted") return;
    const time = `${mm}:${ss}`;
    navigator.serviceWorker.ready
      .then((reg) => {
        reg.showNotification("GymBro", {
          body: t(`Recupero: ${time}`, `Rest: ${time}`),
          tag: "rest-timer",
        });
      })
      .catch(() => {
        try {
          new Notification("GymBro", { body: t(`Recupero: ${time}`, `Rest: ${time}`) });
        } catch {}
      });
  }, [running]);

  // Tick del timer.
  useEffect(() => {
    if (running) {
      // Resetta il flag di "già terminato" quando il timer riparte o cambia preset.
      finishedRef.current = false;
      tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [running]);

  // Cambio target: reset del flag di terminazione così un cambio preset
  // durante la corsa non causa un "finish" prematuro.
  useEffect(() => {
    finishedRef.current = false;
  }, [target]);

  // Side effects al termine del countdown.
  useEffect(() => {
    if (!running || seconds < target || finishedRef.current) return;
    finishedRef.current = true;
    setRunning(false);

    // Vibrazione (feature detection safe)
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch {
        // ignora: alcuni browser sollevano se la pagina non ha user-activation
      }
    }

    // Suono
    if (soundOn && typeof Audio !== "undefined") {
      try {
        const audio = new Audio("/sounds/beep.mp3");
        audio.volume = 0.8;
        void audio.play().catch(() => {
          // 404 del file o autoplay bloccato: silente
        });
      } catch {
        // ignora
      }
    }

    // Notifica di completamento (sostituisce quella di avvio se presente)
    if (typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification("GymBro", {
            body: t("Riposo terminato! Prossima serie 💪", "Rest over! Next set 💪"),
            tag: "rest-timer",
          });
        });
      } catch {
        try {
          new Notification("GymBro", { body: t("Riposo terminato! Prossima serie 💪", "Rest over! Next set 💪") });
        } catch {}
      }
    }
  }, [running, seconds, target, soundOn]);

  const toggleSound = useCallback(() => setSoundOn((v) => !v), []);

  return (
    <div className="mt-8 rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Timer className="h-4 w-4" /> {t("Recupero", "Rest")}
        </div>
        <div className="flex gap-1">
          {[60, 90, 120, 180].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTarget(t);
                setSeconds(0);
              }}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                target === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-5xl font-black tracking-tighter tabular-nums">{mm}:{ss}</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className="rounded-full border border-border px-3 py-2 text-xs font-semibold"
            aria-label={soundOn ? t("Disattiva suono", "Mute sound") : t("Attiva suono", "Enable sound")}
            aria-pressed={soundOn}
            title={soundOn ? t("Suono attivo", "Sound on") : t("Suono disattivato", "Sound off")}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setSeconds(0);
              setRunning(false);
            }}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold"
          >
            {t("Reset", "Reset")}
          </button>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground"
          >
            {running ? t("Pausa", "Pause") : t("Avvia", "Start")}
          </button>
        </div>
      </div>
    </div>
  );
}
