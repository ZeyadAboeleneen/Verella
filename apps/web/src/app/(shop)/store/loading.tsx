export default function StoreLoading() {
  return (
    <div className="min-h-screen">
      <div className="bg-[#000000] py-14 md:py-24 px-5 md:px-16" />
      <div className="py-10 md:py-16 px-5 md:px-16 max-w-[1280px] mx-auto">
        <div className="mb-8 flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-[#FCE8CD]" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[1.75rem] bg-[#FAECD2]">
              <div className="h-72 animate-pulse bg-[#FCE8CD]" />
              <div className="space-y-3 p-6">
                <div className="h-4 w-2/3 animate-pulse rounded bg-[#FCE8CD]" />
                <div className="h-6 w-1/2 animate-pulse rounded bg-[#FCE8CD]" />
                <div className="h-12 animate-pulse rounded-2xl bg-[#FCE8CD]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
