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
    // After the data is restored: if the group stage is over, make sure the
    // runner-up playoff exists.
    try {
      const { ensureRunnerUpPlayoff } = await import('./lib/tournamentService');
      ensureRunnerUpPlayoff();
    } catch (err) {
      console.error('[knockout] startup check failed:', err);
    }
  }
}
