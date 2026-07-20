export default function Home() {
  return (
    <div className="page-wash flex min-h-full flex-col">
      <header className="relative hero-glow flex min-h-[88vh] flex-col items-center justify-center px-6 pb-20 pt-16 text-center sm:px-10">
        <p className="animate-fade-up font-display text-5xl tracking-tight text-stone-800 sm:text-6xl md:text-7xl">
          Bloom
        </p>
        <h1 className="animate-fade-up-delay mt-8 max-w-xl font-display text-2xl font-normal leading-snug text-stone-800 sm:text-3xl md:text-4xl">
          Grow a sakura tree from the habits you keep.
        </h1>
        <p className="animate-fade-up-delay mt-5 max-w-md text-base leading-relaxed text-stone-600 sm:text-lg">
          A quiet habit tracker for Windows. Consistency becomes bloom — not
          another streak dashboard.
        </p>
        <div className="animate-fade-up-delay-2 mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <a
            href="#download"
            className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-gradient-to-r from-rose-400 to-rose-500 px-7 py-3.5 text-sm font-medium text-white shadow-sm shadow-rose-300/40 transition hover:from-rose-500 hover:to-rose-600"
          >
            Get the desktop app
          </a>
          <a
            href="https://github.com/TAFH-debug/bloom"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-w-[200px] items-center justify-center rounded-full border border-rose-200/80 bg-white/50 px-7 py-3.5 text-sm font-medium text-stone-700 backdrop-blur-sm transition hover:border-rose-300 hover:bg-white/70"
          >
            View on GitHub
          </a>
        </div>
      </header>

      <section
        aria-labelledby="how-heading"
        className="mx-auto w-full max-w-2xl px-6 py-20 sm:px-10"
      >
        <h2
          id="how-heading"
          className="font-display text-xl text-stone-800 sm:text-2xl"
        >
          How it works
        </h2>
        <ol className="mt-10 space-y-8 border-l border-rose-200/60 pl-6 sm:pl-8">
          <li>
            <span className="font-display text-lg text-rose-500/90">1.</span>
            <p className="mt-1 text-base leading-relaxed text-stone-600">
              <span className="font-medium text-stone-800">Plant habits</span>{" "}
              — daily, weekly, or on your own rhythm. Plain names, no clutter.
            </p>
          </li>
          <li>
            <span className="font-display text-lg text-rose-500/90">2.</span>
            <p className="mt-1 text-base leading-relaxed text-stone-600">
              <span className="font-medium text-stone-800">Check in</span> when
              you show up. Your garden remembers the days you tended it.
            </p>
          </li>
          <li>
            <span className="font-display text-lg text-rose-500/90">3.</span>
            <p className="mt-1 text-base leading-relaxed text-stone-600">
              <span className="font-medium text-stone-800">Watch it bloom</span>{" "}
              — a living sakura tree fills with petals as your consistency
              grows.
            </p>
          </li>
        </ol>
      </section>

      <footer
        id="download"
        className="mt-auto border-t border-rose-200/50 bg-gradient-to-b from-transparent to-amber-100/30 px-6 py-16 sm:px-10"
      >
        <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl text-stone-800">
              Ready to grow?
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone-600">
              Bloom runs on Windows as a desktop app — your tree on the home
              screen, reminders when you need them.
            </p>
          </div>
          <a
            href="https://github.com/TAFH-debug/bloom"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-rose-400 to-amber-200/90 px-7 py-3.5 text-sm font-medium text-stone-800 shadow-sm transition hover:from-rose-500 hover:to-amber-200"
          >
            Download from GitHub
          </a>
        </div>
        <p className="mx-auto mt-12 max-w-2xl text-xs text-stone-500">
          © {new Date().getFullYear()} Bloom — quiet spring garden, not
          productivity SaaS.
        </p>
      </footer>
    </div>
  );
}
