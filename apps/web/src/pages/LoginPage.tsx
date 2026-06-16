export function LoginPage(): JSX.Element {
  return (
    <div className="min-h-full flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Sign in</h1>
        <p className="text-sm text-slate-600 mb-6">
          Authentication is wired up in Phase 2.
        </p>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              placeholder="admin@laundry.local"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              disabled
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              disabled
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-md bg-brand-600 text-white py-2 font-medium hover:bg-brand-700 disabled:opacity-50"
            disabled
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
