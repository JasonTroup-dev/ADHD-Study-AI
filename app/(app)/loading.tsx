export default function AppLoading() {
  return (
    <div className="page-shell" aria-label="Loading page">
      <div className="page-container animate-pulse space-y-8 motion-reduce:animate-none">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded-full bg-[#ddd5c5]" />
          <div className="h-10 w-64 max-w-full rounded-xl bg-[#ddd5c5]" />
          <div className="h-5 w-96 max-w-full rounded-full bg-[#e6dece]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-40 rounded-2xl border border-[#19241f]/10 bg-[#fffdf8]" />
          ))}
        </div>
        <div className="h-80 rounded-2xl border border-[#19241f]/10 bg-[#fffdf8]" />
      </div>
    </div>
  );
}
