import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton per `/storico`. Riflette header + month-nav + volume chart + heat-map + lista sessioni.
 */
export function StoricoSkeleton() {
  return (
    <div className="container-app animate-in fade-in pt-10">
      <header className="mb-6 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-32" />
      </header>

      {/* Month navigation */}
      <Skeleton className="mb-6 h-16 rounded-2xl" />

      {/* Volume chart */}
      <Skeleton className="mb-6 h-48 rounded-2xl" />

      {/* Year heat-map */}
      <Skeleton className="mb-6 h-72 rounded-3xl" />

      {/* Session list */}
      <div className="space-y-2">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    </div>
  );
}
