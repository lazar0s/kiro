import { Outlet } from 'react-router-dom';

export function AppShell(): JSX.Element {
  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-brand-500 flex items-center justify-center font-bold">
              L
            </div>
            <h1 className="text-lg font-semibold">Laundry Dashboard</h1>
          </div>
          <div className="text-sm text-slate-400">Phase 1 — scaffold</div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
