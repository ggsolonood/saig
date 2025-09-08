// app/loading.jsx
export default function Loading() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-fuchsia-50 via-rose-50 to-indigo-50 py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-6 text-center">
          <div className="h-8 w-48 mx-auto rounded-lg bg-white/70 animate-pulse" />
          <div className="h-4 w-64 mx-auto mt-3 rounded-lg bg-white/60 animate-pulse" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl overflow-hidden shadow-sm"
            >
              <div className="w-full aspect-[16/9] bg-gray-200 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-4 w-2/3 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-3 w-full bg-gray-200 rounded-md animate-pulse" />
                <div className="h-3 w-5/6 bg-gray-200 rounded-md animate-pulse" />
                <div className="flex gap-2 pt-2">
                  <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                </div>
                <div className="flex justify-end pt-3">
                  <div className="h-9 w-28 bg-gray-200 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
