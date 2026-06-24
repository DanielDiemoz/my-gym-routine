import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton fallback per route lazy-loaded (Suspense boundary).
 * Mostra un placeholder neutro che non "salta" al primo paint del contenuto.
 */
export function PageSkeleton() {
  return (
    <div className="container-app pt-10" aria-busy="true" aria-live="polite">
      <header className="mb-8">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="mt-3 h-8 w-40 rounded-md" />
      </header>
      <Skeleton className="mb-6 h-32 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <div className="mt-6 space-y-2">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
}
