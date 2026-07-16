import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Dumbbell,
  History,
  Users,
  TrendingUp,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage, tx } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 transition-colors hover:border-foreground/30">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function LandingPage() {
  const { t } = useLanguage();

  const features = [
    {
      icon: <Dumbbell className="h-5 w-5" />,
      title: t("Schede di allenamento", "Workout plans"),
      description: t(
        "Crea e organizza le tue schede, divisi per giorni ed esercizi, sempre a portata di mano.",
        "Create and organize your plans, split by days and exercises, always at hand.",
      ),
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: t("Allenati e traccia", "Train and track"),
      description: t(
        "Registra serie, ripetizioni e carichi durante l'allenamento, senza perdere il ritmo.",
        "Log sets, reps and loads during your workout without losing the pace.",
      ),
    },
    {
      icon: <History className="h-5 w-5" />,
      title: t("Storico e progressi", "History and progress"),
      description: t(
        "Rivedi i tuoi allenamenti passati e osserva i tuoi progressi nel tempo.",
        "Review past workouts and watch your progress over time.",
      ),
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: t("La tua cerchia", "Your circle"),
      description: t(
        "Condividi schede e allenamenti con amici e coach per allenarti insieme.",
        "Share plans and workouts with friends and coaches to train together.",
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
          <Button asChild variant="ghost" size="sm">
            <Link to="/auth">{t("Accedi", "Log in")}</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container-app py-20 text-center md:py-28">
        <div className="mx-auto max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("Allenamento essenziale", "Essential training")}
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            {t("Traccia i tuoi allenamenti,", "Track your workouts,")}
            <br />
            <span className="text-primary">{t("senza distrazioni.", "no distractions.")}</span>
          </h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {t(
              "Crea schede, allenati e tieni traccia dei tuoi progressi settimanali. Tutto in un'unica app semplice e veloce.",
              "Create plans, train and keep track of your weekly progress. All in one simple, fast app.",
            )}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full rounded-full sm:w-auto">
              <Link to="/auth">
                {t("Inizia a tracciare gli allenamenti", "Start tracking workouts")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full rounded-full sm:w-auto">
              <Link to="/auth">{t("Accedi", "Log in")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-app pb-24">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-app pb-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-8 text-center md:p-12">
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            {t("Pronto a iniziare?", "Ready to start?")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            {t(
              "Registrati gratuitamente e crea la tua prima scheda in meno di un minuto.",
              "Sign up for free and create your first plan in less than a minute.",
            )}
          </p>
          <Button asChild size="lg" className="mt-6 rounded-full">
            <Link to="/auth">
              {t("Inizia a tracciare gli allenamenti", "Start tracking workouts")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {t("Gratis per iniziare", "Free to start")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {t("Nessuna carta richiesta", "No card required")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {t("Su cellulare e desktop", "Mobile and desktop")}
            </span>
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
