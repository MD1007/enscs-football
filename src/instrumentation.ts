// Runs once when the Next.js server starts.
export async function register() {
  // The import must sit inside this positive check so the Node-only database
  // code is left out of the edge build.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NEXT_PHASE === 'phase-production-build') return;
    try {
      const { startPersistence } = await import('./lib/persistence');
      await startPersistence();
    } catch (err) {
      console.error('[persistence] startup failed:', err);
    }
  }
}
