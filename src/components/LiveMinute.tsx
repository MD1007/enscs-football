'use client';

import React, { useEffect, useState } from 'react';
import { Match } from '@/lib/types';
import { elapsedMs, minuteOf, serverNowEstimate, syncServerTime } from '@/lib/liveClock';

interface LiveMinuteProps {
  match: Pick<Match, 'status' | 'clock_started_at' | 'clock_accumulated_ms' | 'clock_running'>;
  /** Server time when the page was rendered (server components pass Date.now()). */
  serverNow?: number;
  className?: string;
}

/** Ticking match minute for a live match, e.g. "23'". Renders nothing when no clock was started. */
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

  const ms = elapsedMs({ running, startedAt: match.clock_started_at ?? null, accumulatedMs: accumulated }, now);
  const minute = Math.min(minuteOf(ms), 199);

  return (
    <span className={className} title={running ? 'Match clock' : 'Clock paused'}>
      {running ? `${minute}'` : `⏸ ${minute}'`}
    </span>
  );
}
