import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Dumbbell,
  ArrowRight,
  Sparkles,
  Smartphone,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage, tx } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function FeatureShot({
  src,
  title,
  description,
}: {
  src: string;
  title: string;
  description: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md">
      <div className="relative bg-gradient-to-b from-muted/40 to-muted/10 p-4 sm:p-6">
        <div className="mx-auto max-w-[260px] overflow-hidden rounded-[2rem] border-[6px] border-foreground/90 bg-background shadow-xl">
          <img
            src={src}
            alt={title}
            loading="lazy"
            className="aspect-[9/19] w-full object-cover"
          />
        </div>
      </div>
      <div className="space-y-2 p-6">
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function LandingPage() {
  const { t, language, setLanguage } = useLanguage();

  const shots = [
    {
      src: "/landing/home.png",
      title: t("La tua settimana in un colpo d'occhio", "Your week at a glance"),
      description: t(
        "Dashboard con streak, obiettivo settimanale e giorni allenati. La costanza diventa un gioco.",
        "Dashboard with streak, weekly goal and trained days. Consistency becomes a game.",
      ),
    },
    {
      src: "/landing/scheda1.png",
      title: t("Schede in pochi tap", "Plans in a few taps"),
      description: t(
        "Pochi clic per creare, avviabile in qualsiasi momento, con un grande catalogo di esercizi pronti.",
        "A few clicks to create, start it anytime, with a large catalog of exercises ready.",
      ),
    },
    {
      src: "/landing/schede.png",
      title: t("Dettaglio esercizio", "Exercise detail"),
      description: t(
        "Ogni esercizio con serie, ripetizioni e peso: la scheda che usa in palestra, sempre a portata di mano.",
        "Every exercise with sets, reps and weight: your gym plan, always at hand.",
      ),
    },
    {
      src: "/landing/storico.png",
      title: t("Il tuo diario, per sempre", "Your diary, forever"),
      description: t(
        "Storico mensile con il dettaglio di ogni serie, ripetizione e carico. Rivivi i tuoi progressi.",
        "Monthly history with every set, rep and load. Relive your progress.",
      ),
    },
    {
      src: "/landing/cerchie.png",
      title: t("Allenati in gruppo", "Train together"),
      description: t(
        "Le Cerchie: classifiche per volume settimanale e statistiche del gruppo. Sana competizione.",
        "Circles: weekly volume leaderboards and group stats. Healthy competition.",
      ),
    },
    {
      src: "/landing/cerchia.png",
      title: t("Dentro la cerchia", "Inside the circle"),
      description: t(
        "Nella cerchia c'è la classifica, puoi vedere gli allenamenti degli altri e vivere una sana competizione.",
        "Inside the circle there's the leaderboard, you can see others' workouts and enjoy healthy competition.",
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="container-app flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Dumbbell className="h-4 w-4" />
            </span>
            GymBro
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border border-border bg-card p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLanguage("it")}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  language === "it" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                IT
              </button>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                EN
              </button>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">{t("Accedi", "Log in")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container-app py-20 text-center md:py-28">
        <div className="mx-auto max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3.5 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("Allenamento essenziale", "Essential training")}
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
            {t("Traccia i tuoi allenamenti,", "Track your workouts,")}
            <br />
            <span className="text-primary">{t("senza distrazioni.", "no distractions.")}</span>
          </h1>
          <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground">
            {t(
              "Crea schede, allenati e osserva i tuoi progressi. Tutto in un'unica app semplice e veloce.",
              "Create plans, train and watch your progress. All in one simple, fast app.",
            )}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <Button asChild size="lg" className="w-full rounded-full px-8 sm:w-auto">
              <Link to="/auth" search={{ mode: "signup" }}>
                {t("Inizia ora", "Get started")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="link" className="w-full text-muted-foreground sm:w-auto">
              <Link to="/auth">{t("Hai già un account? Accedi", "Already have an account? Log in")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature shots */}
      <section className="container-app pb-24">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground">
            <Smartphone className="h-3.5 w-3.5 text-primary" />
            {t("Vista dall'app", "Inside the app")}
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight md:text-4xl">
            {t("Così appare GymBro", "This is what GymBro looks like")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            {t(
              "Screenshot reali, pensati per l'uso con una mano in palestra.",
              "Real screenshots, designed for one-handed use at the gym.",
            )}
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shots.map((s) => (
            <FeatureShot key={s.src} src={s.src} title={s.title} description={s.description} />
          ))}
        </div>
      </section>

      {/* Social */}
      <section className="container-app pb-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-8 text-center md:p-12">
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            {t("Seguici sui social", "Follow us on social")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            {t(
              "Consigli di allenamento, demo e aggiornamenti su GymBro.",
              "Training tips, demos and GymBro updates.",
            )}
          </p>
          <div className="mt-6 flex items-center justify-center gap-5">
            <a
              href="https://www.instagram.com/try.gymbro"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Instagram className="h-7 w-7" />
            </a>
            <a
              href="https://www.tiktok.com/@trygymbro"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
                <path d="M16.5 3c.4 2.3 1.8 3.9 4.1 4.2v3c-1.5.1-2.9-.3-4.1-1v6.1c0 3.3-2.6 5.9-5.9 5.9-3.2 0-5.7-2.4-5.7-5.6 0-3.2 2.6-5.7 5.8-5.7.4 0 .9.1 1.3.2v3.1c-.4-.1-.9-.2-1.3-.2-1.5 0-2.7 1.2-2.7 2.7 0 1.5 1.2 2.7 2.7 2.7 1.5 0 2.7-1.1 2.8-2.7V3h3.9z" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container-app flex h-16 items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold">GymBro</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
