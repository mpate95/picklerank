export function Header() {
  return (
    <header className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-line bg-panel/70 p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan/70">Weekly ladder</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Private pickleball league HQ</h2>
      </div>
      <p className="max-w-sm text-sm text-slate-400 md:text-right">
        Sessions, results, ratings, and trendlines in one place.
      </p>
    </header>
  );
}
