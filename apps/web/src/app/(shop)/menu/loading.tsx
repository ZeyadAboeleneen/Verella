export default function MenuLoading() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-16 md:px-16">
      <div className="mb-10 h-10 w-48 animate-pulse rounded bg-[#FCE8CD]" />
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="mb-10">
          <div className="mb-4 h-6 w-32 animate-pulse rounded bg-[#FCE8CD]" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#FAECD2]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
