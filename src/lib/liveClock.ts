// Shared maths for the match stopwatch. The clock is stored as
// "time banked so far" + "when the current running stretch began".

export interface ClockState {
  running: boolean;
  startedAt: number | null; // epoch ms when the current running stretch began
  accumulatedMs: number; // time banked before that stretch
}

export const EMPTY_CLOCK: ClockState = { running: false, startedAt: null, accumulatedMs: 0 };

export function elapsedMs(clock: ClockState, now: number): number {
  const live = clock.running && clock.startedAt ? Math.max(0, now - clock.startedAt) : 0;
  return Math.max(0, clock.accumulatedMs + live);
}

/** 14:30 on the clock is the 15th minute. */
export function minuteOf(ms: number): number {
  return Math.floor(ms / 60000) + 1;
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// Difference between the server's clock and this device's clock, so every
// viewer sees the same match minute even if their phone's time is off.
let serverOffsetMs = 0;

export function syncServerTime(serverNow?: number | null) {
  if (typeof serverNow === 'number' && Number.isFinite(serverNow)) {
    serverOffsetMs = serverNow - Date.now();
  }
}

export function serverNowEstimate(): number {
  return Date.now() + serverOffsetMs;
}
