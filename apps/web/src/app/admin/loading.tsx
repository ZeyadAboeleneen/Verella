export default function AdminLoading() {
  return (
    <div>
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-surface-container-high" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-container-lowest" />
        ))}
      </div>
      <div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface-container-lowest" />
    </div>
  );
}
