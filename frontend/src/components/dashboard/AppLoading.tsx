import type { ReactNode } from "react";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-white/[0.06] motion-reduce:animate-none ${className}`}
    />
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151517] p-5 sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

interface AppLoadingProps {
  label?: string;
}

export default function AppLoading({
  label = "Carregando seus recursos..."
}: AppLoadingProps) {
  return (
    <div role="status" aria-live="polite">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />

        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-48 bg-white/[0.04]" />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-start">
        <Card>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-md bg-violet-400/10" />
            <Skeleton className="h-3 w-28 bg-violet-400/10" />
          </div>

          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-6 w-16 rounded-full bg-violet-400/10" />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>

            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          <Skeleton className="mt-6 h-10 w-full rounded-xl" />
        </Card>

        <div className="min-w-0 space-y-5">
          <Card>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-3 w-full max-w-sm" />

            <div className="mt-5 flex items-center gap-3">
              <Skeleton className="h-12 min-w-0 flex-1 rounded-xl" />
              <Skeleton className="h-12 w-11 shrink-0 rounded-xl" />
            </div>

            <Skeleton className="mt-5 h-12 w-full rounded-xl bg-violet-400/[0.06]" />
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-md bg-violet-400/10" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-3/4" />
            <Skeleton className="mt-6 h-12 w-full rounded-xl bg-violet-400/[0.06]" />
          </Card>
        </div>
      </div>

      <span className="sr-only">{label}</span>
    </div>
  );
}
