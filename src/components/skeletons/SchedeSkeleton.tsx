import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton per `/schede`. Riflette header + CTA + lista schede.
 */
export function SchedeSkeleton() {
  return (
    <div className="container-app animate-in fade-in pt-10">
      <header className="mb-6 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-32" />
      </header>

      {/* CTA "Nuova scheda" */}
      <Skeleton className="mb-4 h-12 rounded-full" />

      {/* Lista piani */}
      <div className="space-y-2">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    </div>
  );
}
