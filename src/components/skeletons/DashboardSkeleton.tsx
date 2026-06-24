import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton per `/` (dashboard). Rispecchia la struttura reale della pagina
 * in modo che il passaggio loading → loaded non causi salti di layout.
 */
export function DashboardSkeleton() {
  return (
    <div className="container-app animate-in fade-in pt-10">
      <header className="mb-8 flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </header>

      {/* Week hero */}
      <Skeleton className="h-44 rounded-3xl" />

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>

      {/* Streak */}
      <Skeleton className="mt-4 h-36 rounded-2xl" />

      {/* Quick start */}
      <div className="mt-8">
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      </div>

      {/* Recent */}
      <div className="mt-8">
        <Skeleton className="mb-3 h-5 w-20" />
        <div className="space-y-2">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
