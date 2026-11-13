'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ClockState, EMPTY_CLOCK, HALF_MS, elapsedMs, isClockPeriod, readClock } from './liveClock';

const keyFor = (matchId: number) => `enscs_match_clock_${matchId}`;

function readStored(matchId: number): ClockState | null {
  try {
    const raw = window.localStorage.getItem(keyFor(matchId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.accumulatedMs !== 'number') return null;
    return {
      running: Boolean(parsed.running),
      startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
      accumulatedMs: parsed.accumulatedMs,
      period: isClockPeriod(parsed.period) ? parsed.period : null,
    };
  } catch {
    return null; // private mode / blocked storage: the clock still works in memory
  }
}

function writeStored(matchId: number, clock: ClockState | null) {
  try {
    if (clock) window.localStorage.setItem(keyFor(matchId), JSON.stringify(clock));
    else window.localStorage.removeItem(keyFor(matchId));
  } catch {
    // ignore
  }
}

/**
 * Pitch-side stopwatch for one match, with two halves. State lives in
 * localStorage, so a refresh or a closed tab never loses the running time.
 * `fallback` (the clock last saved on the server) is adopted when this device
 * has nothing stored, e.g. when the admin switches phones mid-match.
 */
export function useMatchClock(matchId: number | null, fallback?: ClockState | null) {
  const [clock, setClock] = useState<ClockState>(EMPTY_CLOCK);
  const [now, setNow] = useState<number>(() => Date.now());
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  // Load when the match changes.
  useEffect(() => {
    if (matchId === null) {
      setClock(EMPTY_CLOCK);
      return;
    }
    const stored = readStored(matchId);
    const fb = fallbackRef.current;
    setClock(stored || (fb && (fb.running || fb.accumulatedMs > 0) ? fb : EMPTY_CLOCK));
    setNow(Date.now());
  }, [matchId]);

  // Tick only while running.
  useEffect(() => {
    if (!clock.running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [clock.running]);

  const commit = useCallback(
    (next: ClockState) => {
      setClock(next);
      setNow(Date.now());
      if (matchId !== null) writeStored(matchId, next.running || next.accumulatedMs > 0 ? next : null);
      return next;
    },
    [matchId]
  );

  /** Kick-off: first half starts at 00:00. */
  const start = useCallback(
    () => commit({ running: true, startedAt: Date.now(), accumulatedMs: 0, period: 'first' }),
    [commit]
  );

  const pause = useCallback(
    () => commit({ ...clock, running: false, startedAt: null, accumulatedMs: elapsedMs(clock, Date.now()) }),
    [commit, clock]
  );

  const resume = useCallback(
    () => commit({ ...clock, running: true, startedAt: Date.now() }),
    [commit, clock]
  );

  /** Half time: whatever stoppage was played, the clock goes back to 30:00 and waits. */
  const halfTime = useCallback(
    () => commit({ running: false, startedAt: null, accumulatedMs: HALF_MS, period: 'half_time' }),
    [commit]
  );

  /** Second half starts from 30:00. */
  const startSecondHalf = useCallback(
    () => commit({ running: true, startedAt: Date.now(), accumulatedMs: HALF_MS, period: 'second' }),
    [commit]
  );

  const reset = useCallback(() => commit(EMPTY_CLOCK), [commit]);

  const elapsed = elapsedMs(clock, now);
  const hasStarted = clock.running || clock.accumulatedMs > 0;
  const reading = readClock(clock, now);

  return {
    clock,
    elapsed,
    hasStarted,
    running: clock.running,
    period: clock.period || null,
    reading,
    minute: reading.minute,
    start,
    pause,
    resume,
    halfTime,
    startSecondHalf,
    reset,
  };
}
