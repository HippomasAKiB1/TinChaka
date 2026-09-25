export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md p-8 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-xl backdrop-blur-sm">
        <h1 className="text-3xl font-extrabold text-emerald-400 tracking-tight">TinChaka</h1>
        <p className="mt-2 text-lg text-slate-300 font-medium">তিন চাকা — Dhaka Ride Pooling MVP</p>
        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          TinChaka — coming online
        </div>
        <p className="mt-6 text-xs text-slate-400">
          Share a seat. Split the fare. Survive Dhaka traffic.
        </p>
      </div>
    </main>
  );
}
