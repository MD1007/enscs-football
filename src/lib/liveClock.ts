// Shared maths for the match stopwatch. The clock is stored as
// "time banked so far" + "when the current running stretch began".

/** Which part of the match the clock is in. Undefined = a clock started before halves existed. */
export type ClockPeriod = 'first' | 'half_time' | 'second';

/** One half lasts 30 minutes: first half 1'-30', second half 31'-60'. */
export const HALF_MS = 30 * 60 * 1000;

export interface ClockState {
  running: boolean;
  startedAt: number | null; // epoch ms when the current running stretch began
  accumulatedMs: number; // time banked before that stretch
  period?: ClockPeriod | null;
}

export function isClockPeriod(value: unknown): value is ClockPeriod {
  return value === 'first' || value === 'half_time' || value === 'second';
}

export interface ClockReading {
  /** What fans see: "23'", "30+2'", "HT", "47'", "60+4'". */
  label: string;
  /** Minute to stamp on a goal or card (stoppage time stays on 30 or 60). */
  minute: number;
  /** Added minutes being played (0 outside stoppage time). */
  stoppage: number;
  phase: 'first' | 'half_time' | 'second' | 'legacy';
}

/**
 * Turns the raw clock into match time.
 * First half: 1'-30', then 30+1', 30+2'... until the organiser presses Half Time.
 * Half time: the clock sits on 30:00 and waits.
 * Second half: 31'-60', then 60+1', 60+2'... until Full Time.
 */
export function readClock(clock: ClockState, now: number): ClockReading {
  const ms = elapsedMs(clock, now);
  const minuteOfMs = (v: number) => Math.floor(v / 60000) + 1;

  if (clock.period === 'half_time') {
    return { label: 'HT', minute: 30, stoppage: 0, phase: 'half_time' };
  }
  if (clock.period === 'first') {
    if (ms < HALF_MS) {
      const minute = minuteOfMs(ms);
      return { label: `${minute}'`, minute, stoppage: 0, phase: 'first' };
    }
    const extra = minuteOfMs(ms - HALF_MS);
    return { label: `30+${extra}'`, minute: 30, stoppage: extra, phase: 'first' };
  }
  if (clock.period === 'second') {
    const played = Math.max(ms, HALF_MS);
    if (played < 2 * HALF_MS) {
      const minute = minuteOfMs(played);
      return { label: `${minute}'`, minute, stoppage: 0, phase: 'second' };
    }
    const extra = minuteOfMs(played - 2 * HALF_MS);
    return { label: `60+${extra}'`, minute: 60, stoppage: extra, phase: 'second' };
  }
  const minute = Math.min(minuteOfMs(ms), 199);
  return { label: `${minute}'`, minute, stoppage: 0, phase: 'legacy' };
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
