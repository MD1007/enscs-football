'use client';

import React, { useEffect, useState } from 'react';
import { Match } from '@/lib/types';
import { isClockPeriod, readClock, serverNowEstimate, syncServerTime } from '@/lib/liveClock';

interface LiveMinuteProps {
  match: Pick<Match, 'status' | 'clock_started_at' | 'clock_accumulated_ms' | 'clock_running' | 'clock_period'>;
  /** Server time when the page was rendered (server components pass Date.now()). */
  serverNow?: number;
  className?: string;
}

/**
 * Ticking match time for a live match: "23'", "30+2'", "HT", "47'", "60+4'".
 * Renders nothing when no clock was started.
 */
export default function LiveMinute({ match, serverNow, className }: LiveMinuteProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (serverNow) syncServerTime(serverNow);
    setNow(serverNowEstimate());
    const id = setInterval(() => setNow(serverNowEstimate()), 5000);
    return () => clearInterval(id);
  }, [serverNow]);

  const running = Boolean(match.clock_running);
  const accumulated = match.clock_accumulated_ms || 0;
  if (match.status !== 'live' || now === null || (!running && accumulated <= 0)) return null;

  const reading = readClock(
    {
      running,
      startedAt: match.clock_started_at ?? null,
      accumulatedMs: accumulated,
      period: isClockPeriod(match.clock_period) ? match.clock_period : null,
    },
    now
  );

  const isHalfTime = reading.phase === 'half_time';
  const text = isHalfTime ? 'HT' : running ? reading.label : `⏸ ${reading.label}`;
  const title = isHalfTime
    ? 'Half time'
    : reading.phase === 'first'
    ? 'First half'
    : reading.phase === 'second'
    ? 'Second half'
    : running
    ? 'Match clock'
    : 'Clock paused';

  return (
    <span className={className} title={title} aria-label={`${title}: ${text}`}>
      {text}
    </span>
  );
}
