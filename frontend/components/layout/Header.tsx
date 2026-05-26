export function Header() {
  return (
    <header className="mb-5 rounded-[1.6rem] border border-line bg-panel/70 p-4 backdrop-blur md:mb-8 md:rounded-[2rem] md:p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan/70">Weekly ladder</p>
        <h2 className="mt-2 text-xl font-semibold text-white md:text-2xl">Private pickleball league HQ</h2>
      </div>
      <p className="mt-3 hidden max-w-sm text-sm text-slate-400 md:block md:text-right">
        Sessions, results, ratings, and trendlines in one place.
      </p>
    </header>
  );
}
