export default function StoreLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 md:px-16 md:pt-16">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="space-y-4 md:col-span-4 md:self-end">
          <div className="h-3 w-24 animate-pulse rounded bg-surface-container" />
          <div className="h-20 w-3/4 animate-pulse rounded-xl bg-surface-container" />
        </div>
        <div className="flex h-[520px] gap-2 md:col-span-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`animate-pulse rounded-2xl bg-surface-container ${i === 0 ? "flex-[6]" : "flex-1"}`} />
          ))}
        </div>
      </div>
      <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/5] animate-pulse rounded-xl bg-surface-container" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-container" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container" />
          </div>
        ))}
      </div>
    </div>
  );
}
