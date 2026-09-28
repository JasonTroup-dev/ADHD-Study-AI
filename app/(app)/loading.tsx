export default function AppLoading() {
  return (
    <div className="page-shell" aria-label="Loading page">
      <div className="page-container animate-pulse space-y-8 motion-reduce:animate-none">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-10 w-64 max-w-full rounded-lg bg-gray-200" />
          <div className="h-5 w-96 max-w-full rounded bg-gray-200" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-40 rounded-2xl border border-gray-200 bg-white" />
          ))}
        </div>
        <div className="h-80 rounded-2xl border border-gray-200 bg-white" />
      </div>
    </div>
  );
}
